# Frog Pay

With Frog Pay, users can pay with _anything_, _anywhere._ We issue a virtual card for everyone so they can spend their balance across any EVM chain. They can use it anywhere that accepts VISA! It was built over the weekend for [Aleph Hackathon](https://dorahacks.io/hackathon/aleph-hackathon/detail).

This README.md is the technical stuff. Read this to learn exactly how Frog Pay works, including how we issue cards, how users pay, and how they can make more money in their savings accounts through using our Vaults feature. You can also follow along to learn how to run this app on your local machine.

If you're a judge and you'd like to learn more about exactly how we qualify for the bounties we're applying for, please read the [hackathon submission details](./HACKATHON_SUBMISSION_DETAILS.md).

[Pitch deck]()

[Demo]()

[Go to market]()

[Hackathon submission details](./HACKATHON_SUBMISSION_DETAILS.md)

## Features

- Create a self-custodial virtual card that allows you to pay in fiat whatever is instore or online. The merchant receives FIAT while you use your crypto without having to worry about conversions or any of the crypto headache

- Create Vaults and fill them with any token in your account. These Vaults can be collaborative which means you can invite other people to contribute to it while remaining the control of the funds. Also, the funds in the Vault get staked automatically and restaked in a Symbiotic vault allowing you to increase your money passively. There's a special animation when you reach your goal!

- Each payment that you do using _Frog Pay_ gives you onhain points that you can redeem to use in the ecosystem (e.g. sponsored swaps in 0x) and also in real life stores (e.g. getting cashback on transactions)

## How it works

There are three important flows:

1. Sign up - issuing a fiat card for the user and doing ERC-20 approvals

2. Making a payment - we route through our treasury to cover their transaction in fiat, and use their approval to send us tokens

3. Creating and contributing to vaults - we deploy a vault contract with the user as the owner

### 1. Sign Up

We implemented _reown_ as our wallet provider, which allows us to provide an easy a friendly interface for the user to enter to our platform.

> Note: we wanted to focus on UX for this demo, so we chose an EOA flow rather than a smart wallet flow. This has a few fallbacks, such as the fact we can't use social logins or easily sponsor transactions. We will implement smart wallets as the primary flow in the Buildathon - smart wallets also allow us to add a few more restrictions to make payments more secure.

After the user connects to the platform, we prompt him for his first and last name that we will use later for the card creation. The next step is to solicite approval of their selected ERC20 (USDC by default) of the user. They can select all ERC-20s that exist on Frog testnet, and USDC is required.

Once the user gives their approval, the important part comes. Using our Stripe Business account (a real one that we created with a real business called [FrogPay](https://find-and-update.company-information.service.gov.uk/company/NI732549) in UK 😄) we issue a card on his name and we store all the important information in our database.

After funding their account, we mint 1000 welcome points. The sign-up process takes around 20seconds (more if you approve more ERC-20s) and after that you will have a self-custodial virtual card that you would be able to use to buy our favourite coffee with _magic internet money_.

### 2. Payments

We have a funded Stripe Issuing account. Transactions pull through our funded account, but route through the user's card so it still appears on statements and documents related to tax compliance. The user can spend their card anywhere that accepts VISA.

Every time the user attempts to use their card, we receive an event in our backend and Stripe asks us to authorize or not. Stripe allows us 2 seconds before responding, so we are able to check the user's balance and lock up tokens until the payment is resolved. This is the happy path - in future we e will be able to implement other measures with smart wallets in future, such as 5 second days on transactions to accounts other than our contract, which is how Gnosis Pay works.

1. In the case the user don't pass the validations, we simply reject the payment and it will be reflected in the PoS that the user is using. If you use our shop, you will see a timeout error - I guess Stripe needs better error handling!

2. In the case that the user pass the validations, we cover their transaction in fiat using our own liquidity pool in Stripe, and after the payment was processed succesfully we execute a transaction to collect the equivalent amount of the payment in the token that he granted approval before. Finally we record everything in the database and mint points to the user as a reward for their spending.

### Vaults

Vaults turn this app from a virtual card to a familiar e-banking experience. Users can create vaults, secured by smart contracts, for saving goals or emergency funds. We deploy the vault contract for them (through a vault factory) which means they do not have to pay gas to deploy. They are set as the `owner` of the vault which means only they can withdraw.

Users can copy the vault contract address and share with others who have Frog Pay (or just a Lisk wallet!) and they can contribute too. This expands the functionality drastically and can be used for family savings accounts, crowdfunding, angel investments, and more. It's a beautiful marriage of blockchain and the familiarity of traditional banking.

As well as creating a smart contract, we also add the vault into our database. This allows a faster loading experience, and also means that when other users are added as contributors they can see it in their frontend without needing to be added to the smart contract (causing a transaction, therefore gas).

Vaults are key to a few things:

1. Users making more money through savings accounts, similar to what they might be used to in their banking apps

2. We make money as a business through Vaults, as we keep some of their staking profits

When a user deposits into a vault, our smart contract handles swapping their token into something that can be staked into a Symbiotic vault to earn more in a secure way.

### Points

We have followed the succcess of Payy Wallet and realized that points have allowed them to go viral on X. (Side note - we're huge fans of Payy but they have a centralized prover, so are not fully self-custodial, and they do not have an experience that rivals banks).

Points are held in a smart contract and are similar to ERC-20s but they are non-transferrable. They can only be minted and burned by the admins of the contract. The contract also stores a leaderboard of Points which is a fun addition that any Frog app can incorporate.

Currently, a user gains points from signing up and using their card to make a payment. We have plans to incorporate points for referrals, making friends on the app, time-bound payments, recurring payments, opening and sharing vaults, and more. We see Points as a way to turn this into a mix between bank, self-custodial funds, and socialfi.

### Other UX benefits

- It is a Progressive Web App and works on all devices, and is optimized for mobile

- Users can swap native token to USDC directly in the app with one tap to allow the card to spend their native balance (native balance doesn't work natively as there is no `approve` flow)

- Vaults are deployed gaslessly

- Users can see a full list of their transactions in plain English

- Users can easily remove the ERC-20 approvals at any time from Settings

### Database Schema

![alt text](database-schema.png)

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind
- **Backend:** Serverless Next.js APIs
- **Contracts:** Solidity and Foundry, deployed onto Lisk and Base
- **Database**: Supabase and Drizzle
- **Wallet Provider**: Reown
- **Staking**: Symbiotic
- **Swap and bridge API**: LI.FI
- **Card issuing**: Stripe Issuing. Currently in Sandbox, but we have an company based in the UK and have approval from Stripe to go live. We want to launch in the Argentinian regulatory sandbox

_Built by [Nacho](https://x.com/ziginiz) and [Cat](https://x.com/catmcgeecode) with ❤️‍🔥_
