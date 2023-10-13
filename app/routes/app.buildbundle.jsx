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

  const bundledProductIds = [];
  const productVariantIds = [];
  
  requestData.products.forEach(bundledProduct => {
    bundledProductIds.push(bundledProduct.productId);
    bundledProduct.productVariantId.forEach(variantId => {
      productVariantIds.push(variantId);
    });
  });

  console.log("Length:"+requestData.products.length)
  const amounts = [];
  for (let i=0; i<requestData.products.length; i++) {
    //todo: input qty
    amounts.push("1");  
  }
  // create component_quantities metafield expected content - Product List Array
  const component_quantities = "[" + amounts.join(",") + "]";

  // create component_quantities metafield expected content - JSON
  const component_reference = JSON.stringify(productVariantIds);

  const formData = requestData;

  const responseCreate = await admin.graphql(
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
                selectedOptions {
                    name,
                    value
                }
                metafields(first: 2) {
                  edges {
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
              options: ["Default"],
              metafields: [
                {
                  key: "component_quantities",
                  namespace: "custom",
                  value: component_quantities,
                },
                {
                  key: "component_reference",
                  namespace: "custom" ,
                  value: component_reference,
                }
              ]
            }
          ]
        }
      }
    }
    );
  const buildResponseJson = await responseCreate.json();
  if (!responseCreate.ok) {
    throw new Error('Bundle creation failed');
  }
  // Capture the response data from the bundle, retrieve the Parent Product GraphQL ID
  const componentParent = buildResponseJson.data.productCreate.product.variants.edges[0].node.id;
  const componentParentEscaped = componentParent; // left in case of special chars
  
  // Create a GraphQL variable for passing variant IDs to Bundle Components mutation
  const graphQLVariable = [];
  productVariantIds.forEach(id => {
    let variantJson = {
      "id": id,
      "quantity": 1,
    }
    graphQLVariable.push(variantJson);
  });

  const jsonGqlVariable = JSON.stringify(graphQLVariable);
  const jsonParsedVariable = JSON.parse(jsonGqlVariable);

  // Create the bundle component relationship
  const responseRelate = await admin.graphql(
    `#graphql
    mutation CreateBundleComponents($input: [ProductVariantRelationshipUpdateInput!]!) {
      productVariantRelationshipBulkUpdate(input: $input) {
        parentProductVariants {
          id
          productVariantComponents(first: 10) {
            nodes{
              id
              quantity
              productVariant {
                id
              }
            }
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          parentProductVariantId: `${componentParentEscaped}`,
          productVariantRelationshipsToCreate: jsonParsedVariable
        }
      }
    }
  );
  const responseRelateJson = await responseRelate.json();
  //Log the response to the terminal for verification
  console.log("response2 "+JSON.stringify(responseRelateJson))

  const enableComponents = await admin.graphql(
    `#graphql
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
          requiresComponents
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
            id: `${componentParentEscaped}`,
            requiresComponents: true,
          }
      }
    }
  );
  if (!enableComponents.ok) {
    throw new Error('Component link failed');
  } else {
    console.log("Component updated OK");
  }

  const enableComponentsJson = await enableComponents.json();

  // Await the response, log the terminal
  console.log("component response "+JSON.stringify(enableComponentsJson));

  const bundleDataRef = formData;

  for (const product of bundleDataRef.products) {
    await createQuery(product);
  }

  async function createQuery(product) {

    // Create the relationship metafields for the Child Product variants - part 1
    const metafield = [{
      "id": `${componentParentEscaped}`, 
      "component_reference": {
        value: JSON.parse(component_reference)
      },
      "component_quantities": {
        value: JSON.parse(component_quantities) 
      }
    }];

    // Create the relationship metafields for the Child Product variants - part 2
    const variableData = {
      variables: {
        productId: product.productId,
        variants: product.productVariantId.map(variantId => ({
          id: variantId,
          metafields: 
            {
              key: "component_parents",
              namespace: "custom",
              value: JSON.stringify(metafield)
            }
        }))
      }
    }

    // Bulk update the variants with the metafield value to complete the relationship and we're done
    const responseFinal = await admin.graphql(
      `#graphql
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            product {
              id
            }
            productVariants {
              id
              metafields(first: 2) {
                edges {
                  node {
                    namespace
                    key
                    value
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
          variables: variableData.variables,
        }
      );
    
      let responseFinalJson = await responseFinal.json();
      return(
        {
          product: responseFinalJson.data.productVariantsBulkUpdate.product,
        } 
      );
    }
//  const responseCreateJson = await responseCreate.json();

  // Return a result to the page - this is a placeholder - see responseFinalJson for structure
  return {
    product: "Bundle created successfully.",
  };
}

// The page itself - construct the request to for processing by action(), render page
export default function BuildBundle() {
  
  const [bundleTitle, setBundleTitle] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [qty, setQty] = useState("");

  const nav = useNavigation();
  const { shop } = useLoaderData();
  const actionData = useActionData();


  const isLoading =
  ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";


  const productForm =  useLoaderData();
  const errors = useActionData()?.errors || {};

  const [formState, setFormState] = useState(productForm);
  const [cleanFormState, setCleanFormState] = useState(productForm);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(cleanFormState);

  const [formData, setFormData] = useState({
    bundleTitle: "",
    bundlePrice: "",
    quantity: qty,
    selectedProducts: [],
  });

  const handleBundleTitleChange = (value) => {
    setFormData({
      ...formData,
      bundleTitle: value,
    });
  };
  
  const handleVariantQtyChange = (value) => {
    setQty(value);
    setFormData({
      ...formData,
      quantity: value,
    });
  };

  const handleBundlePriceChange = (value) => {
    setFormData({
      ...formData,
      bundlePrice: value,
    });
  };

  const submit = useSubmit();

  const productId = actionData?.product?.id?.replace(
    "gid://shopify/Product/",
    ""
  );

  // render the product selector
  async function selectProduct() {
  
    const selectedProducts = await window.shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
  
    if (selectedProducts) {
      const updatedFormState = selectedProducts.map((product) => {
        const { images, id, variants, title } = product;

        const variantIds = variants.map((variant) => variant.id);

        return {
          productId: id,
          productVariantId: variantIds,
          productTitle: title,
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
  // Return the bundle contents GUI to the page
  const BundleProducts = () => {
    const bundledProducts = formState.selectedProducts;
    return (
      bundledProducts.map((bundledProducts,index) => 
        <HorizontalStack key={bundledProducts.productId} align="space-between" blockAlign="center" gap={"5"}>
          <HorizontalStack key={bundledProducts.productId} align="start" blockAlign="center" gap={"5"}>
            <Thumbnail
              source={bundledProducts.productImage || ImageMajor}
              alt={bundledProducts.productAlt}
            />
            <Text as="span" variant="headingMd" fontWeight="semibold">
              {bundledProducts.productTitle}
            </Text>
          </HorizontalStack>
          {/*
          Adds a Quantity selector - needs to loop - currently hardcoded to 1 per item
          <HorizontalStack key={bundledProducts.productId} align="end" blockAlign="center" gap={"5"}>
            <TextField
              label="Quantity"
              type="number"
              value={qty}
              onChange={handleVariantQtyChange}
              autoComplete="off"
            />
          </HorizontalStack> */}
        </HorizontalStack>
      )
    )
  }

  // If a productId exists in the action return value, show the toast and clear the form fields
  useEffect(() => {
    if (productId) {
      shopify.toast.show("Bundle created");
      setBundleTitle("");
      setBundlePrice("");
    }
  }, [productId]);
  
  // Build and submit request to the action() for use in GraphQL
  const CreateProductBundle = () => {
   
    const bundleData = {
      bundleTitle: formData.bundleTitle,
      bundlePrice: formData.bundlePrice,
      products: formState.selectedProducts,
    };

    // Note: remix ONLY sends useSubmit data as application/x-www-form-urlencoded - so must be coerced to JSON
    submit({json: JSON.stringify(bundleData)}, { replace: false, method: "POST" });
  };

  return (
    <Page>
      <ui-title-bar title="Build a bundle">
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

                <HorizontalStack gap="3" align="start">
                <Link url="/app">
                  <Button loading={isLoading}>
                      Home
                  </Button>
                </Link>
                </HorizontalStack>
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
                    App specs
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
