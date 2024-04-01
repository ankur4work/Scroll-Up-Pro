// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import cancelSubscription from "./cancel-subscription.js";
import GDPRWebhookHandlers from "./gdpr.js";
import dotenv from "dotenv";


dotenv.config();

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

const PREMIUM_PLAN = 'MeroxIO Premium';
const MEROXIO = "meroxio";
const PREMIUM_PLAN_KEY = "mobile_menu_premium";
const IS_TEST = false;

const APP_NAME = "MeroxIO Sticky Mobile Menu"



app.get("/api/createSubscription", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const hasPayment = await shopify.api.billing.check({
      session,
      plans: [PREMIUM_PLAN],
     
    });

    if (hasPayment) {
      console.log('Already active subscription');
      res.status(200).send({
        isActiveSubscription: true,
      });
    } else {
      const redirectUrl = await shopify.api.billing.request({
        session,
        plan: PREMIUM_PLAN,
        isTest: IS_TEST,
      });
      console.log("Redirect URL: " + redirectUrl);
      res.status(200).send({
        isActiveSubscription: false,
        confirmationUrl: redirectUrl,
      });
    }
  } catch (error) {
    console.error("Failed to create subscription:", error);
    res.status(500).send({
      error: "Failed to create subscription",
    });
  }
});



app.get("/api/cancelSubscription", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const hasPayment = await shopify.api.billing.check({
      session,
      plans: [PREMIUM_PLAN],
      isTest: IS_TEST,
    });

    if (hasPayment) {
      console.log('Active subscription found. Cancelling subscription...');
      const subscriptionStatus = await cancelSubscription(session);
      console.log("Subscription cancelled. Status:", subscriptionStatus);

      // Remove the metafield if it exists
      const client = new shopify.api.clients.Graphql({ session });
      const currentInstallations = await client.query({
        data: {
          query: CURRENT_APP_INSTALLATION,
          variables: {
            namespace: MEROXIO,
            key: PREMIUM_PLAN_KEY
          },
        }
      });

      // @ts-ignore
      const metafield = currentInstallations.body.data.currentAppInstallation.metafield;

      if (metafield) {
        console.log("Removing appOwnedMetafield for shop:", session.shop);
        const mutationResponse = await client.query({
          data: {
            query: DELETE_APP_DATA_METAFIELD,
            variables: {
              input: {
                id: metafield.id
              }
            },
          },
        });

        // @ts-ignore
        if (mutationResponse.body.errors && mutationResponse.body.errors.length) {
          console.error("Failed to delete metafield:", mutationResponse.body.errors);
        } else {
          console.log("Metafield deleted successfully for shop:", session.shop);
        }
      }

      res.status(200).send({
        status: subscriptionStatus,
      });
    } else {
      console.log('No active subscription found.');
      res.status(200).send({
        status: "No subscription found",
      });
    }
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    res.status(500).send({
      error: "Failed to cancel subscription",
    });
  }
});




app.get("/api/hasActiveSubscription", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const hasPayment = await shopify.api.billing.check({
      session,
      plans: [PREMIUM_PLAN],
      isTest: IS_TEST,
    });

    if (hasPayment) {
      console.log('Active subscription found');
      const client = new shopify.api.clients.Graphql({ session });
      const currentInstallations = await client.query({
        data: {
          query: CURRENT_APP_INSTALLATION,
          variables: {
            namespace: MEROXIO,
            key: PREMIUM_PLAN_KEY
          },
        }
      });

      // @ts-ignore
      const ownerId = currentInstallations.body.data.currentAppInstallation.id;
      console.log(currentInstallations.body.data.currentAppInstallation.metafield);

      if(!currentInstallations.body.data.currentAppInstallation.metafield){
      // Create metafield
      const mutationResponse = await client.query({
        data: {
          query: CREATE_APP_DATA_METAFIELD,
          variables: {
            metafieldsSetInput: [
              {
                namespace: MEROXIO,
                key: PREMIUM_PLAN_KEY,
                type: "boolean",
                value: "true",
                ownerId: ownerId
              }
            ],
          },
        },
      });

      // @ts-ignore
      if (mutationResponse.body.errors && mutationResponse.body.errors.length) {
        console.error("Failed to add metafield");
      } else {
        console.log("Metafield for premium plan created/updated successfully for shop: ", session.shop);
      
      }
    }

      res.status(200).send({
        hasActiveSubscription: true,
      });
    } else {
      res.status(200).send({
        hasActiveSubscription: false,
      });
    }
  } catch (error) {
    console.error("Failed to fetch subscription:", error);
    res.status(500).send({
      error: "Failed to fetch subscription",
    });
  }
});


app.get("/api/getshop", async (req, res) => {
  const session = res.locals.shopify.session;
  let status = 200;
  let error = null;
  try {
    var response = {'shop': session?.shop}
    res.status(status).send(response);
  } catch (e) {
    console.log(`Failed to get Shop: ${e.message}`);
    status = 500;
    error = e.message;
  }
  
});

const shopDetailsQuery = `
{
  shop {
    name
    email
    primaryDomain {
      url
      host
    }
    plan {
      displayName
    }
  }
}`;

app.get("/api/store-details", async (req, res) => {
  console.log("Request received for store details via GraphQL");
  const session = res.locals.shopify.session;
  if (!session) {
    console.log('No active session found');
    return res.status(401).send({ error: 'No active session' });
  }

  try {
    const client =  new shopify.api.clients.Graphql({ session });
    const response = await client.query({
      data: shopDetailsQuery,
    });

    const { name, email,primaryDomain, plan } = response.body.data.shop;
    //console.log("Shop Details:", { name, email,primaryDomain, plan });

    storeShopDetails({
      appName: APP_NAME,
      storeUrl: primaryDomain.url,
      name: name,
      email: email,
      plan: plan.displayName
    });
    
    res.status(200).send({ message: 'Shop details fetched successfully', data: { name,email, primaryDomain, plan }});
  } catch (error) {
    console.error('Failed to fetch shop details via GraphQL:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


async function storeShopDetails(shopDetails) {
  try {
    const response = await fetch('https://app.meroxio.com/app-installation-data-store/storedata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shopDetails),
    });
    
    if (!response.ok) throw new Error('Network response was not ok.');
    
    const data = await response.json();
    //console.log('Success:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}



app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);

const CURRENT_APP_INSTALLATION = `
    query appSubscription($namespace: String!, $key: String!) {
      currentAppInstallation {
        id
        metafield(namespace: $namespace, key: $key) {
          namespace
          key
          value
          id
        }
      }
    }
`;

const CREATE_APP_DATA_METAFIELD = `
mutation CreateAppDataMetafield($metafieldsSetInput: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafieldsSetInput) {
    metafields {
      id
      namespace
      key
    }
    userErrors {
      field
      message
    }
  }
}
`;


const DELETE_APP_DATA_METAFIELD = `
mutation metafieldDelete($input: MetafieldDeleteInput!) {
    metafieldDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;
