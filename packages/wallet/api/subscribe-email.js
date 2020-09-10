const axios = require("axios");

const { MAILCHIMP_LIST_ID, MAILCHIMP_API_KEY } = process.env;

exports.default = function (req, res) {
  if (!req.body && !req.body.email) {
    return res.status(400).json({
      error: "Something is not right!",
    });
  }

  axios
    .post(
      `https://us17.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
      {
        email_address: req.body.email,
        email_type: "html",
        status: "pending",
      },
      {
        auth: {
          username: "signup",
          password: MAILCHIMP_API_KEY,
        },
      }
    )
    .then(() => {
      res.send({ success: true });
    })
    .catch((e) => {
      console.log(e);
      res.status(500).send({ error: "Email cannot be registered" });
    });
};
