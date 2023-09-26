import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
// import { useQuery } from '@apollo/client';
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import gql from 'graphql-tag';
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Card,
  Button,
  HorizontalStack,
  Box,
  Divider,
  List,
  Link,
  ResourceList,
  ResourceItem,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return json({ shop: session.shop.replace(".myshopify.com", "") });
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        input: {
          title: `${color} Snowboard`,
          variants: [{ price: Math.random() * 100 }],
        },
      },
    }
  );

  const responseJson = await response.json();

  return json({
    product: responseJson.data.productCreate.product,
  });
}

export default function Index() {

  const nav = useNavigation();
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  const productId = actionData?.product?.id.replace(
    "gid://shopify/Product/",
    ""
  );

  
  

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId]);

 // const generateProduct = () => submit({}, { replace: true, method: "POST" });


  return (
    <Page>
      <ui-title-bar title="Build a bundle">
        {/* <button variant="primary" onClick={generateProduct}>
          Generate a product
        </button>
        <button onClick={generateProduct}>
          Statement Bundle Generator
        </button> */}
      </ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <Card>
              <VerticalStack gap="5">
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Create a Bundle
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Click to {" "}
                    <Link url="/app/buildbundle">
                      Build a bundle
                    </Link>
                    .
                  </Text>
                </VerticalStack>
                <VerticalStack gap="2">
                  <Text as="h3" variant="headingMd">
                    Introduction
                  </Text>
                  <Text as="p" variant="bodyMd">
                    This app has been provided as a way to Generate a usable Bundle, easily. <br /><br /> All associations between bundle parent and bundle components are automatically performed. Each Bundle components defaults to a quantity of 1.
                  </Text>
                </VerticalStack>
                <HorizontalStack gap="3" align="end">
                  {actionData?.product && (
                    <Button
                      url={`https://admin.shopify.com/store/${shop}/admin/products/${productId}`}
                      target="_blank"
                    >
                      View product
                    </Button>
                  )}
                  <Link url="/app/buildbundle">
                    <Button loading={isLoading} primary>
                        Build a bundle
                    </Button>
                  </Link>
                </HorizontalStack>
                {actionData?.product && (
                  <Box
                    padding="4"
                    background="bg-subdued"
                    borderColor="border"
                    borderWidth="1"
                    borderRadius="2"
                    overflowX="scroll"
                  >
                    <pre style={{ margin: 0 }}>
                      <code>{JSON.stringify(actionData.product, null, 2)}</code>
                    </pre>
                  </Box>
                )}
              </VerticalStack>
            </Card>
          </Layout.Section>
          <Layout.Section secondary>
            <VerticalStack gap="5">
            <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Pages
                  </Text>
                  <VerticalStack gap="2">
                    <Divider />
                    <HorizontalStack align="start">
                      <Link url="/app">
                        Home
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="start">
                      <Link url="/app/buildbundle">
                        Build a bundle
                      </Link>
                    </HorizontalStack>
                    <Divider />
                  </VerticalStack>
                </VerticalStack>
              </Card>
              <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Instructions
                  </Text>
                  <List spacing="extraTight">
                    <List.Item>
                      Visit the {" "} 
                      <Link url="/app/buildbundle">
                        Build a bundle Page
                      </Link>
                    </List.Item>
                    <List.Item>
                      Enter your product title
                    </List.Item>
                    <List.Item>
                      Enter your Bundle price
                    </List.Item>
                    <List.Item>
                      Hit the 'Select product' button to select your bundle products
                    </List.Item>
                    <List.Item>
                      Hit the green 'Generate a Bundle' button
                    </List.Item>
                  </List>
                </VerticalStack>
              </Card>
              <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <VerticalStack gap="2">
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link url="https://remix.run" target="_blank">
                        Remix
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link url="https://www.prisma.io/" target="_blank">
                        Prisma
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link url="https://polaris.shopify.com" target="_blank">
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                        >
                          App Bridge
                        </Link>
                      </span>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                      >
                        GraphQL API
                      </Link>
                    </HorizontalStack>
                  </VerticalStack>
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
        </Layout>
      </VerticalStack>
    </Page>
  );
}
