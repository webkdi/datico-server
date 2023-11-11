const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
  projectId: "freud-online",
  keyFile: "./freud-online-1d405901c901.json",
  scopes: ["https://www.googleapis.com/auth/indexing"],
});