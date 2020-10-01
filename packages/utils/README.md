# `@signupcash/utils`

Lightweight package providing the necessary functions to use with [Signup library](https://signup.cash). Signup is a non-custodial in-browser DApp wallet for Bitcoin Cash applications on the web.

## Setup

You can use this package in NodeJS or in the browser (but you will need a bundler for that)

```
npm install @signupcash/verify
```

Below the functions available in this package are briefly mentioned.

## verify()

```
import { verify } from '@signupcash/utils';


if (verify(payload, bchAddr, signature)) {
   // signature is correct!
}

```

Read the section in [our documentation](https://docs.signup.cash/signatures) about signatures to understand how to obtain those parameters and what you can do with it!

## License

Licensed under Mozilla Public License 2.0
