import { closeAuction, getEndedAuctions } from "../controllers/auctions";

async function processAuctions(event, context) {
  const auctions = await getEndedAuctions();
  await Promise.all(auctions.map(closeAuction));
  return { closed: auctions.length };
}

export const handler = processAuctions;
