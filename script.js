const requestForm = document.querySelector("#request-form");
const formResult = document.querySelector("#form-result");
const contactInput = document.querySelector("#contact");
const submitButton = requestForm?.querySelector('button[type="submit"]');

requestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const contact = contactInput?.value.trim();

  if (!contact) {
    showFormResult("Укажите почту или Telegram.", true);
    contactInput?.setAttribute("aria-invalid", "true");
    contactInput?.focus();
    return;
  }

  contactInput.removeAttribute("aria-invalid");
  showFormResult("Сохраняю заявку…");
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(LEADS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact,
        website: requestForm.elements.website.value,
        source: window.location.href,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(result.message || "Не удалось сохранить заявку.");

    requestForm.reset();
    showFormResult(result.message || "Заявка принята. Я свяжусь с вами сам.");
  } catch (error) {
    showFormResult(error.message || "Не удалось сохранить заявку. Попробуйте ещё раз.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

contactInput?.addEventListener("input", () => {
  contactInput.removeAttribute("aria-invalid");
  showFormResult("");
});

function showFormResult(message, isError = false) {
  formResult.textContent = message;
  formResult.classList.toggle("error", isError);
}
