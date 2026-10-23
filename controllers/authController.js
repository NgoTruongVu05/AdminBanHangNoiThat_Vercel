import { authenticateAccount } from "../models/accountsModel.js";

const AUTH_KEY = "woodcraft-authenticated";
const ACCOUNT_KEY = "woodcraft-account";

export function getAuthenticatedAccount() {
  if (sessionStorage.getItem(AUTH_KEY) !== "true") return null;
  try {
    return JSON.parse(sessionStorage.getItem(ACCOUNT_KEY) || "null");
  } catch {
    logout();
    return null;
  }
}

export async function renderLogin(onAuthenticated) {
  const response = await fetch("views/login.html");
  if (!response.ok) throw new Error("Không thể tải giao diện đăng nhập.");
  document.querySelector("#app").innerHTML = await response.text();

  const form = document.querySelector(".login-form");
  const errorMessage = document.querySelector(".login-error");
  form.onsubmit = async event => {
    event.preventDefault();
    errorMessage.hidden = true;

    const data = new FormData(form);
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const account = await authenticateAccount(data.get("username"), data.get("password"));
      sessionStorage.setItem(AUTH_KEY, "true");
      sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
      await onAuthenticated();
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
    } finally {
      button.disabled = false;
    }
  };
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(ACCOUNT_KEY);
}
