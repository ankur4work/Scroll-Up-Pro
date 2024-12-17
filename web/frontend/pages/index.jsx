import React from "react";


import {
  Card,
  Page,
  Layout,
  TextContainer,
  Button,
  Modal,
  Icon,
  DataTable,
  MediaCard,
  Frame,
  TopBar,
  CalloutCard,
  VideoThumbnail
} from "@shopify/polaris";


import { useState, useCallback } from 'react';
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import { DisplayText } from "@shopify/polaris";
import { ThemeValidate } from "../components/ThemeSelection";
import { ActiveSubscription } from "../components/ActiveSubscriptionCheck";
import { shopifyBackground } from "../assets";
import ReactPlayer from "react-player";
import {
  ExternalMinor,
  CircleTickMinor, HomeMajor
} from '@shopify/polaris-icons';

import { useNavigate } from "react-router-dom";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Toast } from "@shopify/app-bridge-react";
import { Iconkeyfeature } from "../components/Iconkeyfeature";
import { TotalWishlists } from "../components/TotalWishlists";




export default function HomePage() {
  const emptyToastProps = { content: null };
  const [isLoadingSubscribe, setIsLoadingSubscribe] = useState(false);
  const [isLoadingCancelSubscribe, setIsLoadingCancelSubscribe] = useState(false);

  const [active, setActive] = useState(false);
  const [activelookbook, setActiveLookbook] = useState(false);
  const [activefeed, setActiveFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const [toastProps, setToastProps] = useState(emptyToastProps);
  const activator = <Button onClick={handleChange}>Quick Setup Guide</Button>;


  const {
    data,
  } = useAppQuery({
    url: "/api/getshop",
  });

  const { data: storeDetailsData } = useAppQuery({
    url: "/api/store-details",
  });

  const template = 'index'; // Replace with your actual template value
  const uuid = '9ecd77b5-8137-4afd-8057-ddc8f300e22b'; // Replace with your actual UUID
  const handlePaid = 'meroxio_sticky_mobile'; // Replace with your actual handle
  const handleFree = 'meroxio_sticky_mobile_free';
  const reviewUrl = "https://apps.shopify.com/meroxio-comparison-slider#modal-show=WriteReviewModal"


  function openThemeEditor() {
    console.log("Shop: " + data?.shop);
    const url = `https://${data?.shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handlePaid}`;
    window.open(url);
  }

  function enableFreePlan() {
    const url = `https://${data?.shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handleFree}`;
    window.open(url);
  }

  function openReviewPage() {
    window.open(reviewUrl);
  }

  async function subscribePlan() {
    setIsLoadingSubscribe(true);
    const res = await fetch("/api/createSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingSubscribe(false);
    if (data.error) {
      console.log(data.error);
      setToastProps({ content: "Redirecting to payment page..", error: true });
    } else if (data.confirmationUrl) {
      const { confirmationUrl } = data;
      setToastProps({ content: "Redirecting to payment page.." });
      redirect.dispatch(Redirect.Action.REMOTE, confirmationUrl);
    } else if (data.isActiveSubscription) {
      console.log("Already subscribed")
      setToastProps({ content: "You already have a active subscription" });
    }
  }


  async function cancelSubscription() {
    setIsLoadingCancelSubscribe(true);
    const res = await fetch("/api/cancelSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingCancelSubscribe(false);
    console.log(data.status);
    if (data.status === "CANCELLED") {
      setToastProps({ content: "Successfully Cancelled the subscription" });
      window.location.reload();
    } else {
      setToastProps({ content: "Failed to cancel the subscription" });
    }

  }


  const toastMarkup = toastProps.content && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );


  const tickIcon = <Icon
    source={CircleTickMinor}
    color="success"
  />


  const rows = [
      ['Cost', 'Free', '$2.99/month'],
      ['Limit on Wishlist Products', '2 Products', 'Unlimited'],
      ['NO Powered By MeroxIO Bar', '-', tickIcon],
      ['No Show MeroxIO Logo in Product Grid', '-', tickIcon],
      ['Add to Cart Button', '-', tickIcon],
      ['Variant Selection for Wishlist Items', '-', tickIcon],
      ['Priority Email/Chat Support', '-', tickIcon]
  ];
  

  // m-lookbook-hearder-part-starting

  const navigate = useNavigate();

  const logo = {

    width: 450,
    height: 90,

    topBarSource:
      `https://cdn.shopify.com/s/files/1/0571/4372/2059/files/MeroxIO_Comparison_Slider_1.png?v=1733589020`,
    url: '/',
    accessibilityLabel: 'https://cdn.shopify.com/s/files/1/0627/5727/3793/files/lookbook_logo.png?v=1666164778',

  };

  const gotoHomePage = () => {
    navigate("/");
  }

  

  const secondaryMenuMarkup = (
    <TopBar.Menu
      activatorContent={
        <div className="main-icon">
          <div className="main-icon-1"><Button onClick={gotoHomePage} plain monochrome removeUnderline fullWidth >
              <div className="m-icon-show-1"><Icon source={HomeMajor} /><span className="m-hover-text-1"> <h1>Home</h1></span></div></Button>

          </div>
          
        </div>
      }

    />
  );





  const topBarMarkup = (
    <TopBar
      secondaryMenu={secondaryMenuMarkup}

    />
  );



  return (
    <Frame topBar={topBarMarkup} logo={logo} >
      <Page>
        {toastMarkup}
        <Layout>
          <Layout.Section>
            <div className="custom-callout-container">
              <CalloutCard
                title="Activate Move To Wishlist"
                illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
                primaryAction={{ content: 'Activate Now - Premium Plan ➡️', onAction: openThemeEditor, accessibilityLabel: 'Enable Now - Premium Plan' }}
                secondaryAction={{content: 'Activate Now - Free Plan ➡️', onAction: enableFreePlan, accessibilityLabel: 'Enable Now - Free Plan'}}
              >
                <p>
                Are you prepared to upgrade your store's display? Click 'Enable' to activate the Move To Wishlist. Once active, effortlessly adjust settings and tailor the app to complement your store's aesthetic. Enhance your customers' viewing experience now!
                <br/><b>NOTE: Make sure you have subscribed to Premium if you Activate the Premium Plan.</b>
                </p>
              </CalloutCard>
            </div>
          </Layout.Section>
          <Layout.Section>

            <TextContainer>
              <DisplayText size="Large"><span>Introduction</span></DisplayText>

              <p>Welcome to Move To Wishlist by MeroxIO! – Redefine the way customers shop and save their favorite products. Elevate your Shopify store with Wishlist – where convenience meets engagement. Create a shopping experience your customers will love and keep them coming back for more!</p>

              <h2><b>Key Features:</b></h2>
              <ul className="appFeatures">
                <li><strong>Effortless Wishlist Management:</strong> Provide your customers with an easy-to-use wishlist feature that enhances their shopping experience.</li>
                <li><strong>Mobile Drawer:</strong> Enjoy a sleek and responsive wishlist drawer for mobile, ensuring seamless navigation and accessibility.</li>
                <li><strong>Floating Icon:</strong> A customizable floating icon allows customers to access their wishlist anytime, anywhere on your store.</li>
                <li><strong>Wishlist Integration Everywhere:</strong> Enable wishlist functionality across product pages, product grids, and other key sections of your store.</li>
                <li><strong>Move to Wishlist from Cart:</strong> Give customers the ability to move items from their cart to their wishlist, simplifying decision-making and saving favorites.</li>
                <li><strong>Dedicated Wishlist Page:</strong> Feature a beautifully designed wishlist page where customers can add items to their cart with variants or remove items as needed.</li>
                <li><strong>Enhanced Shopping Journey:</strong> Encourage repeat visits and customer loyalty with a wishlist that fits perfectly into your store’s user experience.</li>
              </ul>



            </TextContainer>

            <div style={{ display: "flex" }}>


              <Modal
                activator={activator}
                open={active}
                onClose={handleChange}
                title="Quick Setup in 2.0 themes"
              >
                <Modal.Section>
                  <div>

                    <div style={{ padding: '56% 0 0 0', position: 'relative' }}><iframe src="https://cdn.shopify.com/videos/c/o/v/df56f2120323436db9459c9809f936f9.mp4" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }} title="Quick Setup"></iframe></div>
                  </div>
                </Modal.Section>
              </Modal>


              <Button plain onClick={openThemeEditor} style={{ marginLeft: "auto" }}>
                <div className="appEnableBtn"><span>Enable Now</span>
                  <Icon
                    source={ExternalMinor}
                    color="base"
                  /></div>
              </Button>
            </div>
          </Layout.Section>




          <Layout.Section secondary>
            <Card>
              <div className="videoWrapper" style={{ backgroundImage: `url(${shopifyBackground})`, padding: '22px' }}>
              <video
                  src="https://cdn.shopify.com/videos/c/o/v/494412b9ebd2437eabf0436cfe01f035.mp4"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%' }}
                >
                  Your browser does not support the video tag.
                </video>

              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>



            <div className="planComparison">
              <Card title="Plan Comparison" sectioned

                primaryFooterAction={{
                  content: 'Subscribe to MeroxIO Premium',
                  onAction: () => {
                    subscribePlan()
                  },
                  loading: isLoadingSubscribe
                }}
                secondaryFooterActions={[{
                  content: 'Cancel Subscription',
                  onAction: () => {
                    cancelSubscription()
                  },
                  destructive: true,
                  loading: isLoadingCancelSubscribe
                }
                ]}
              >
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                  ]}
                  headings={[
                    'Features',
                    'Free version',
                    'MeroxIO Premium',
                  ]}
                  rows={rows}
                  increasedTableDensity
                  hasZebraStripingOnData
                  hoverable
                />
              </Card>
            </div>
          </Layout.Section>

          <Layout.Section>
          <ActiveSubscription />
        </Layout.Section>

          <Layout.Section>

            <CalloutCard
              title="How is your experience with our app ?"
              illustration="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/customer-review.gif?v=1668584409"
              primaryAction={{
                content: 'Leave a 5-Star Review',
                onAction: openReviewPage
              }}
            >
              <p>🌟"We're always striving to make our App better for you, and your feedback lights the way! 🚀 Your thoughts and experiences are invaluable to us. If you've enjoyed using our app, we'd be thrilled if you could share your positive experiences with a ⭐⭐⭐⭐⭐ review on the Shopify App Store. Your support not only motivates our team but also helps other merchants discover the benefits of our App! Thank you for being an amazing part of our journey!" 🙌</p>
            </CalloutCard>


          </Layout.Section>

        </Layout>



      </Page>

    </Frame>
  );
}


