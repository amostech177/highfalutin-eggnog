const email = "amossika651@gmail.com";
const newBalance = 1000;

const result = db.users.updateOne(
  { email: email },
  {
    $set: {
      "trial.startsAt": new Date(),
      "trial.endsAt": new Date(Date.now() + 30*24*60*60*1000),
      "trial.caps.funnelsPublished": 9999,
      "trial.caps.leads": 9999,
      "trial.caps.emails": 9999,
      "usage.funnelsPublished": 0,
      "usage.leads": 0,
      "usage.emails": 0,
      "wallet.balance": newBalance
    }
  }
);

const user = db.users.findOne({ email: email });
printjson({
  success: true,
  matchedCount: result.matchedCount,
  modifiedCount: result.modifiedCount,
  message: "Account reset complete",
  walletBalance: user?.wallet?.balance,
  trialEndsAt: user?.trial?.endsAt,
  trialCaps: user?.trial?.caps,
  usage: user?.usage
});
