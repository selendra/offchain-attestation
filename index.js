const express = require("express");
const bodyParse = require("body-parser");
const { config } = require("dotenv");
const { connect } = require("mongoose");
const path = require("path");
const cors = require("cors");
const { ethers } = require("ethers");
const CLAIM = require("./claims");

config({ path: path.join(__dirname, "./config/.env") });
const { db_name, db_user, db_pass, db_port, secret } = process.env;

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParse.json());

function isAuthorized(req) {
  const authorization = req.headers.authorization || null;

  if (!authorization) {
    return { authorized: false, data: null };
  }

  try {
    const user = ethers.utils.verifyMessage(secret, authorization);
    if (!user) {
      return { authorized: false, data: null };
    }
    return { authorized: true, data: user };
  } catch (error) {
    return { authorized: false, data: null };
  }
}

app.post("/sign", async (req, res) => {
  const privateKey = req.body.privateKey;
  const signer = new ethers.Wallet(privateKey);
  const signature = await signer.signMessage(secret);

  res.json({ signature });
});

app.get("/claims/user", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claims = await CLAIM.find({ to: auth.data });
  res.json(claims);
});

app.get("/claims/org", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claims = await CLAIM.find({ attester: auth.data });
  res.json(claims);
});

app.post("/claims/create", async (req, res) => {
  const auth = isAuthorized(req);
  console.log(auth);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const body = req.body;

  console.log(req.body);
  if (auth.data !== body.to) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claim = new CLAIM({ ...body });
  await claim.save();

  res.json(claim);
});

app.post("/claims/delete", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const toDelete = await CLAIM.findOne({ _id: req.body.id });

  if (!toDelete) {
    res.json({ status: "Error", message: "Target not found" });
    return;
  }

  if (toDelete.to !== auth.data && toDelete.attester !== auth.data) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  await CLAIM.findByIdAndDelete(req.body.id);

  res.send({ status: "Success", message: "Claim deleted" });
});

function main() {
  try {
    connect(`mongodb://${db_user}:${db_pass}@127.0.0.1:${db_port}/${db_name}`).then(() => {
      app.listen(3001, () => console.log("Server is running at: 3001"));
    });
  } catch (error) {
    console.log(error);
  }
}

main();
