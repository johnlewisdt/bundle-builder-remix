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
        <h1>[your app] - Bundle products with a few clicks</h1>
        <p>This is the [your app] application. It handles all the legwork for making a bundle, so you don't have to.</p>
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
            <strong>Master product creation</strong>. Easily add your main Bundle product in the simplest form. 
          </li>
          <li>
            <strong>Multiple product browser</strong>. Point and click, or instant search for your bundle items.
          </li>
          <li>
            <strong>Automatic Metafield relations</strong>. Does all the legwork when it comes to associating your bundle and its components.
          </li>
        </ul>
      </div>
    </div>
  );
}
