import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import {
  Page,
  Layout,
  FormLayout,
  Text,
  TextField,
  InlineError,
  VerticalStack,
  Card,
  Bleed,
  Button,
  HorizontalStack,
  Box,
  Divider,
  List,
  Link,
  Thumbnail,
} from "@shopify/polaris";
import { ImageMajor } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return json({ shop: session.shop.replace(".myshopify.com", "") });
};


export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  // Parse the request body to get formData
  const requestBody = await request.formData();
  const requestData = JSON.parse(requestBody.get('json'));

console.log(`Request Body: ${requestBody}`);

  const component_quantities = "[1,1,1,1,1]"
  const component_reference = [];
  component_reference.push(
    // t shirt
    "gid://shopify/ProductVariant/46715308048677",
    "gid://shopify/ProductVariant/46715308343589",
    "gid://shopify/ProductVariant/46715308376357",
    "gid://shopify/ProductVariant/46715308409125",
    "gid://shopify/ProductVariant/46715308441893",
    // shorts
    "gid://shopify/ProductVariant/46715524186405",
    "gid://shopify/ProductVariant/46715524448549",
    "gid://shopify/ProductVariant/46715524481317",
    "gid://shopify/ProductVariant/46715524546853",
    "gid://shopify/ProductVariant/46715524612389",
    "gid://shopify/ProductVariant/46715524645157",
    // whistle
    "gid://shopify/ProductVariant/46715562524965",
    "gid://shopify/ProductVariant/46715562623269",
    // baseball cap
    "gid://shopify/ProductVariant/46715865334053",
    //lanyard
    "gid://shopify/ProductVariant/46715858616613"
  );

  const formData = requestData;

  
  
  console.log(`RD: ${requestData}`);

  const response = await admin.graphql(
   `#graphql
    mutation CreateProductBundle($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          title
          variants(first: 1) {
            edges {
              node {
                id
                price
                metafields(first: 2) {
                  edges {
                    node {
                      key
                      namespace
                      value
                    }
                    node {
                      key
                      namespace
                      value
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          title: formData.bundleTitle,
          variants: [
            {
              price: formData.bundlePrice,
              metafields: [
                {
                  key: "component_quantities",
                  namespace: "custom",
                  value: component_quantities,
                },
                {
                  key: "component_reference",
                  namespace: "custom" ,
                  value: JSON.stringify(component_reference),
                }
              ]
            }
          ]
        }
      }
    }
  );
  
  const responseJson = await response.json();

  return json({
    product: responseJson.data.productCreate.product,
    // log: console.log(responseJson),
  });
}

export default function BuildBundle() {
  
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");

  const nav = useNavigation();
  const { shop } = useLoaderData();
  const actionData = useActionData();

  const productForm =  useLoaderData();
  const errors = useActionData()?.errors || {};

  const [formState, setFormState] = useState(productForm);
  const [cleanFormState, setCleanFormState] = useState(productForm);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const [formData, setFormData] = useState({
    bundleTitle: "",
    bundlePrice: "",
    selectedProducts: [],
  });

  // const handleBundleTitleChange = (/** @type {React.SetStateAction<string>} */ value) => setBundleTitle(value);
  // const handleBundlePriceChange = (/** @type {React.SetStateAction<string>} */ value) => setBundlePrice(value);

  const handleBundleTitleChange = (value) => {
    setFormData({
      ...formData,
      bundleTitle: value,
    });
  };

  const handleBundlePriceChange = (value) => {
    setFormData({
      ...formData,
      bundlePrice: value,
    });
  };

  // const handleSubmit = (event) => console.log(event) 

  const submit = useSubmit();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  const productId = actionData?.product?.id?.replace(
    "gid://shopify/Product/",
    ""
  );

  async function selectProduct() {
  
    const selectedProducts = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
  
    if (selectedProducts) {
      const updatedFormState = selectedProducts.map((product) => {
        const { images, id, variants, title, handle } = product;
        return {
          productId: id,
          productVariantId: variants[0].id,
          productTitle: title,
          productHandle: handle,
          productAlt: images[0]?.altText,
          productImage: images[0]?.originalSrc,
        };
      });
  
      setFormState({
        ...formState,
        selectedProducts: updatedFormState
      });  
    }

  }
  const BundleProducts = () => {
    const bundledProducts = formState.selectedProducts;
    return (
      bundledProducts.map((bundledProducts,index) => 
        <HorizontalStack key={bundledProducts.productId} blockAlign="center" gap={"5"}>
          <Thumbnail
            source={bundledProducts.productImage || ImageMajor}
            alt={bundledProducts.productAlt}
          />
          <Text as="span" variant="headingMd" fontWeight="semibold">
            {bundledProducts.productTitle}
          </Text>
        </HorizontalStack>
      )
    )
  }

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Bundle created");
      setBundleTitle("");
      setBundlePrice("");
    }
  }, [productId]);
  
  
  const CreateProductBundle = () => {
   
    const bundleData = {
      bundleTitle: formData.bundleTitle,
      bundlePrice: formData.bundlePrice,
      products: formState.selectedProducts,
    };


    console.log(JSON.stringify(bundleData));
    submit({json: JSON.stringify(bundleData)}, { replace: false, method: "POST" })
    // submit(bundleData, { replace: false, method: "POST" });
  };

  return (
    <Page>
      <ui-title-bar title="Build a bundle">
        <button variant="primary" onClick={CreateProductBundle}>
          Generate a product
        </button>
        <button onClick={CreateProductBundle}>
          Build a bundle
        </button>
      </ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <Card>
              <VerticalStack gap="5">
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Parent bundle item
                  </Text>
                  <FormLayout>
                  <TextField
                    label="Bundle Title"
                    type="text"
                    autoComplete="off"
                    onChange={handleBundleTitleChange}
                    value={formData.bundleTitle}
                  />
                  <TextField
                    label="Price"
                    type="number"
                    autoComplete="off"
                    onChange={handleBundlePriceChange}
                    value={formData.bundlePrice}
                  />
                  </FormLayout>
                </VerticalStack>
                <VerticalStack gap="2">
                  <Text as="h3" variant="headingMd">
                    Add some products
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Add products to your bundle using the product picker.
                  </Text>
                  <Card>
              <VerticalStack gap="2">
                <HorizontalStack align="space-between">
                  {formState.selectedProducts ? (
                    <Button plain onClick={selectProduct}>
                      Change product
                    </Button>
                  ) : null}
                </HorizontalStack>
                {formState.selectedProducts ? (
                  <BundleProducts/>
                ) : (
                  <VerticalStack gap="2">
                    <Button onClick={selectProduct} id="select-product">
                      Select product
                    </Button>
                    {errors.selectedProducts ? (
                      <InlineError
                        message={errors.selectedProducts}
                        fieldID="myFieldID"
                      />
                    ) : null}
                  </VerticalStack>
                )}
                <Bleed marginInline="20">
                  <Divider />
                </Bleed>
                <HorizontalStack
                  gap="5"
                  align="space-between"
                  blockAlign="start"
                >
                  
                </HorizontalStack>
              </VerticalStack>
            </Card>


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
                  <Button loading={isLoading} primary onClick={CreateProductBundle}>
                    Generate a bundle
                  </Button>
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
              <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List spacing="extraTight">
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
        </Layout>
      </VerticalStack>
    </Page>
  );
}
