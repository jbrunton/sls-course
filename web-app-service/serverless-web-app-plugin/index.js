'use strict';

const spawnSync = require('child_process').spawnSync;

const pluginName = 'Serverless Web App Plugin';
class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this),
    };
  }

  afterDeploy() {
    this.buildWebApp();
    this.syncDirectory();
    this.invalidateCache();
  }

  runAwsCommand(args) {
    let command = 'aws';
    if (this.serverless.variables.service.provider.region) {
      args = ['--region', this.serverless.variables.service.provider.region].concat(args);
    }
    if (this.serverless.variables.service.provider.profile) {
      args = ['--profile', this.serverless.variables.service.provider.profile].concat(args);
    }
    return this.runCommand(command, args);
  }

  runCommand(command, args, opts = {}) {
    const result = spawnSync(command, args, opts);
    const stdout = result.stdout.toString();
    const stderr = result.stderr.toString();
    if (stdout) {
      this.debug(stdout);
    }
    if (stderr) {
      this.debug(stderr);
    }
    return { stdout, stderr };
  }

  buildWebApp() {
    this.log('Building web app...', 'WebAppPlugin');
    const auctionsEndpoint = `https://${this.serverless.variables.service.custom.api.auctionsEndpoint}`;
    this.log(`Auctions API endpoint: ${auctionsEndpoint}`, 'WebAppPlugin');
    this.runCommand('npm', ['run', 'build'], {
      env: {
        ...process.env,
        REACT_APP_AUCTIONS_ENDPOINT: auctionsEndpoint,
      }
    });
  }

  // syncs the `build` directory to the provided bucket
  syncDirectory() {
    this.log('Syncing S3 bucket...');

    const s3Bucket = this.serverless.variables.service.custom.WebAppBucket.name;

    const runSyncCmd = (opts) => {
      const cacheControl = opts.cacheControl;
      const exclude = opts.exclude;
      const deleteFiles = opts.deleteFiles;

      let args = [
        's3',
        'sync',
        '--cache-control',
        cacheControl,
      ];

      if (exclude) {
        args = args.concat(['--exclude', exclude]);
      }

      args = args.concat([
        'build/',
        `s3://${s3Bucket}/`,  
      ]);

      if (deleteFiles) {
        args.push('--delete');
      }
       
      const { stderr } = this.runAwsCommand(args);
      if (stderr) {
        throw new Error('Failed syncing to the S3 bucket');
      }
    }

    runSyncCmd({
      cacheControl: 'max-age=604800',
      exclude: 'main.html',
      deleteFiles: true,
    });

    runSyncCmd({
      cacheControl: 'no-cache',
    });    
  }

  // fetches the domain name from the CloudFront outputs and prints it out
  async domainInfo() {
    const provider = this.serverless.getProvider('aws');
    const stackName = provider.naming.getStackName(this.options.stage);
    const result = await provider.request(
      'CloudFormation',
      'describeStacks',
      { StackName: stackName },
      this.options.stage,
      this.options.region,
    );

    const outputs = result.Stacks[0].Outputs;
    const output = outputs.find(
      entry => entry.OutputKey === 'WebAppDomainName',
    );

    if (output && output.OutputValue) {
      this.debug(`Web App Domain: ${output.OutputValue}`);
      return output.OutputValue;
    }

    this.log('Web App Domain: Not Found');
    const error = new Error('Could not extract Web App Domain');
    throw error;
  }

  async invalidateCache() {
    this.log('Invalidating CloudFront cache...');

    const provider = this.serverless.getProvider('aws');

    const domain = await this.domainInfo();

    const result = await provider.request(
      'CloudFront',
      'listDistributions',
      {},
      this.options.stage,
      this.options.region,
    );

    const distributions = result.DistributionList.Items;
    const distribution = distributions.find(
      entry => entry.DomainName === domain,
    );

    if (distribution) {
      this.debug(
        `Invalidating CloudFront distribution with id: ${distribution.Id}`,
      );
      const args = [
        'cloudfront',
        'create-invalidation',
        '--distribution-id',
        distribution.Id,
        '--paths',
        '/*',
      ];
      const { stderr } = this.runAwsCommand(args);
      if (!stderr) {
        this.debug('Successfully invalidated CloudFront cache');
      } else {
        throw new Error('Failed invalidating CloudFront cache');
      }
    } else {
      const message = `Could not find distribution with domain ${domain}`;
      const error = new Error(message);
      this.log(message);
      throw error;
    }
  }

  log(message) {
    this.serverless.cli.log(message, pluginName);
  }

  debug(message) {
    if (process.env.SLS_DEBUG || this.options.verbose) {
      this.log(message);
    }
  }
}

module.exports = ServerlessPlugin;
