# gop

Multiplayer, realtime Go playing server. Ultra lightweight, can handle
thousands of players on a micro VPS (typically 512 MB RAM).

### Install, run
```bash
git clone git@github.com:louischatriot/gop.git
npm install
node index.js
```

Server is launched on port 5000 by default, this can be customized in
the `lib/config` module.

### Login/sign-up with Google
Players need to authenticate with Google, so you need to have a <a
href="https://console.developers.google.com" target="_blank">Google
Developers Console</a> account with API credentials that you will put in a
`lib/google-auth-creds.js` file that looks like this:

```javascript
module.exports = {
  clientId: 'yourid.apps.googleusercontent.com'
, clientSecret: 'yoursecret'
}
```

**Don't forget to authorize the `/googleauth` redirection url!**
Typically you'll want `http://localhost:5000/googleauth` for
development.

### Run in production
Pretty much the same as in development but started like this (of course
you'll want to use an init script):

```javascript
GOP_ENV=prod node index.js
```

Don't forget to specify the `config.host` parameter in the `lib/config`
module once you know the domain name, and to add the corresponding
redirection url in the Google Developers Console.
