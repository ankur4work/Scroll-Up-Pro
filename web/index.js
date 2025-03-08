// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import cancelSubscription from "./cancel-subscription.js";
import GDPRWebhookHandlers from "./gdpr.js";
import crypto from "crypto";
import dotenv from "dotenv";


import createDbConnection  from './analytics-db.js'; // Database initialization
import { connectToMongoDB } from "./mongodb.js"; // Import the MongoDB utility

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


const PREMIUM_PLAN = 'MeroxIO Premium';
const MEROXIO = "meroxio";
const PREMIUM_PLAN_KEY = "infinite-load-premium";
const IS_TEST = true;
const APP_NAME = "MeroxIO Infinite Load";
const ANALYTICS_DB_PREFIX = "infinite_load"
const HTTP_STATUS = { OK: 200, BAD_REQUEST: 400, UNAUTHORIZED: 401, INTERNAL_SERVER_ERROR: 500 };

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Handles URL-encoded data



app.get("/api/meroxio-proxy/hasSubscription", async (req, res) => {
  try {
    const { shop } = req.query;

    // Validate `shop` parameter
    if (!shop) {
      console.warn("Missing 'shop' parameter in request");
      return res.status(400).send({ error: "Missing 'shop' parameter" });
    }

    console.log(`Request received from shop: ${shop}`);

    // Fetch session from MongoDB
    const collection = await connectToMongoDB();
    const session = await collection.findOne({ shop });

    if (!session) {
      console.warn(`No session found for shop: ${shop}`);
      return res.status(401).send({ error: "Unauthorized: Session not found" });
    }

    // Check subscription status
    const hasPayment = await shopify.api.billing.check({
      session,
      plans: [PREMIUM_PLAN],
      isTest: IS_TEST,
    });

    console.log(`Subscription status for shop ${shop}: ${hasPayment ? "Active" : "Inactive"}`);
    return res.status(200).send({ hasActiveSubscription: !!hasPayment });
  } catch (error) {
    console.error("Error in hasSubscription:", error.message);
    return res.status(500).send({ error: "Failed to fetch subscription" });
  }
});

// Function to log events to the generic analytics table
app.post("/api/meroxio-proxy/:event", async (req, res) => {
  try {
    const { event } = req.params;
    const { merchantId, ...eventData } = req.body; // Extract merchantId and other event data from the body

    // Validate required parameters
    if (!merchantId) {
      console.warn("Missing 'merchantId' parameter in request");
      return res.status(400).send({ error: "Missing 'merchantId' parameter" });
    }

    console.log(`Event received: ${event} for merchant: ${merchantId} with data:`, eventData);

    // Create a dynamic DB connection based on the app name (ANALYTICS_DB_PREFIX is fixed)
    const db = createDbConnection(ANALYTICS_DB_PREFIX);

    // Prepare the event data as a JSON string
    const eventDataString = JSON.stringify(eventData);

    // Log the event to the dynamic table for the specific app
    db.run(
      `INSERT INTO ${ANALYTICS_DB_PREFIX}_events (event_type, merchant_id, event_data) VALUES (?, ?, ?)`,
      [event, merchantId, eventDataString],
      function (err) {
        if (err) {
          console.error("Error logging event:", err.message);
          return res.status(500).send({ error: "Failed to log event" });
        }
        console.log("Event logged successfully:", this.lastID);
        res.status(200).send({ success: true, eventId: this.lastID });
      }
    );
  } catch (error) {
    console.error("Error handling event:", error.message);
    res.status(500).send({ error: "Failed to handle event" });
  }
});


app.use("/api/*", shopify.validateAuthenticatedSession());


// Utility Function for Error Response
const handleError = (res, statusCode, message) => {
  console.error(message);
  res.status(statusCode).send({ error: message });
};


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
    console.log("Failed to create subscription:", error);
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

// Route: Fetch Store Details
app.get('/api/store-details', async (req, res) => {
  console.log('Fetching store details via GraphQL...');
  const session = res.locals.shopify.session;

  if (!session) return handleError(res, HTTP_STATUS.UNAUTHORIZED, 'No active session found.');

  try {
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.query({ data: shopDetailsQuery });

    const { name, email, primaryDomain, plan } = response.body.data.shop;

    // Store shop details in external service
    storeShopDetails({
      appName: APP_NAME,
      storeUrl: primaryDomain.url,
      name,
      email,
      plan: plan.displayName,
    });

    console.log('Shop details fetched successfully.');
    res.status(HTTP_STATUS.OK).send({
      message: 'Shop details fetched successfully',
      data: { name, email, primaryDomain, plan },
    });
  } catch (error) {
    handleError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to fetch store details: ${error.message}`);
  }
});

// Utility Function: Store Shop Details
async function storeShopDetails(shopDetails) {
  try {
    const response = await fetch('https://app.meroxio.com/app-installation-data-store/storedata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopDetails),
    });

    if (!response.ok) throw new Error('Network response was not ok.');
    console.log('Shop details stored successfully.');
  } catch (error) {
    console.error('Failed to store shop details:', error.message);
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
