const requestForm = document.querySelector("#request-form");
const formResult = document.querySelector("#form-result");
const contactInput = document.querySelector("#contact");

requestForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const contact = contactInput?.value.trim();

  if (!contact) {
    contactInput?.setAttribute("aria-invalid", "true");
    formResult.classList.add("error");
    formResult.textContent = "Укажите почту или Telegram.";
    contactInput?.focus();
    return;
  }

  contactInput.removeAttribute("aria-invalid");
  formResult.classList.remove("error");
  const message = "Здравствуйте! Хочу попробовать подбор вакансий на 7 дней.";
  const username = typeof TELEGRAM_USERNAME === "string" ? TELEGRAM_USERNAME.replace(/^@/, "") : "";
  const target = username
    ? `https://t.me/${username}?text=${encodeURIComponent(message)}`
    : `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(message)}`;

  window.open(target, "_blank", "noopener,noreferrer");
  formResult.textContent = username
    ? "Заявка подготовлена в Telegram. Нажмите «Отправить»."
    : "Заявка подготовлена. Добавьте Telegram username в site-config.js перед публикацией.";
});

contactInput?.addEventListener("input", () => {
  contactInput.removeAttribute("aria-invalid");
  formResult.classList.remove("error");
  formResult.textContent = "";
});
