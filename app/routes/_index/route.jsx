import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import indexStyles from "./style.css";

export const links = () => [{ rel: "stylesheet", href: indexStyles }];

export async function loader({ request }) {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return json({ showForm: Boolean(login) });
}

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className="index">
      <div className="content">
        <h1>JLDT Bundle Builder</h1>
        <p>Bundle products the proper way</p>
        {showForm && (
          <Form method="post" action="/auth/login">
            <label>
              <span>Shop domain</span>
              <input type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button type="submit">Log in</button>
          </Form>
        )}
        <ul>
          <li>
            <strong>Shopify style picker</strong>. Pick your bundled products in the way you'd expect.
          </li>
          <li>
            <strong>Discount compatible</strong>. Fully compatible with standard product discounts - no need to script.
          </li>
          <li>
            <strong>Automatic relationships</strong>. Automatically creates the relationships required to check out as a Bundle. Follows the Shopify Bundle API spec, for easy customisation.
          </li>
        </ul>
      </div>
    </div>
  );
}
