import AWS from 'aws-sdk';

const client = new AWS.SES({
  region: 'eu-west-2'
});

async function sendMail(event, context) {
  const record = event.Records[0];
  const email = JSON.parse(record.body);
  const { subject, body, recipient } = email;
  const params = {
    Source: 'noreply@jbrunton.com',
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Body: {
        Text: {
          Data: body,
        },
      },
      Subject: {
        Data: subject,
      },
    },
  };

  try {
    const result = await client.sendEmail(params).promise();
    console.log(result);
    return result;
  } catch (e) {
    console.error(e);
  }
}

export const handler = sendMail;


