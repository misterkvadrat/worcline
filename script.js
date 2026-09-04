const requestForm = typeof document === "undefined" ? null : document.querySelector("#request-form");
const formResult = typeof document === "undefined" ? null : document.querySelector("#form-result");
const contactInput = typeof document === "undefined" ? null : document.querySelector("#contact");
const submitButton = requestForm?.querySelector('button[type="submit"]');
let database;

requestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const contact = parseContact(contactInput?.value);

  if (!contact) {
    showFormResult("Укажите корректную почту или Telegram в формате @username.", true);
    contactInput?.setAttribute("aria-invalid", "true");
    contactInput?.focus();
    return;
  }

  contactInput.removeAttribute("aria-invalid");
  showFormResult("Сохраняю заявку…");
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  try {
    if (requestForm.elements.website.value) {
      showFormResult("Заявка принята. Я свяжусь с вами сам.");
      return;
    }

    await getDatabase().collection("leads").add({
      contact: contact.value,
      channel: contact.channel,
      source: window.location.href.slice(0, 500),
      status: "Новая",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    requestForm.reset();
    showFormResult("Заявка принята. Я свяжусь с вами сам.");
  } catch (error) {
    console.error("Lead storage failed:", error.code || error.message);
    showFormResult("Не удалось сохранить заявку. Попробуйте ещё раз позже.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

contactInput?.addEventListener("input", () => {
  contactInput.removeAttribute("aria-invalid");
  showFormResult("");
});

function getDatabase() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId || !FIREBASE_CONFIG.appId) {
    throw new Error("Firebase is not configured");
  }

  if (!database) {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
    database = firebase.firestore(app);
  }

  return database;
}

function parseContact(value) {
  const contact = typeof value === "string" ? value.trim().slice(0, 254) : "";
  const telegramUrl = contact.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{5,32})\/?$/i);

  if (telegramUrl) return { value: `@${telegramUrl[1]}`, channel: "telegram" };
  if (/^@[a-zA-Z0-9_]{5,32}$/.test(contact)) return { value: contact, channel: "telegram" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) return { value: contact, channel: "email" };
  return null;
}

function showFormResult(message, isError = false) {
  formResult.textContent = message;
  formResult.classList.toggle("error", isError);
}

if (typeof module !== "undefined") {
  module.exports = { parseContact };

  if (require.main === module) {
    const assert = require("node:assert/strict");
    assert.deepEqual(parseContact("user@example.com"), { value: "user@example.com", channel: "email" });
    assert.deepEqual(parseContact("@worcline_user"), { value: "@worcline_user", channel: "telegram" });
    assert.deepEqual(parseContact("https://t.me/worcline_user"), { value: "@worcline_user", channel: "telegram" });
    assert.equal(parseContact("telegram"), null);
    console.log("Lead validation checks passed");
  }
}
