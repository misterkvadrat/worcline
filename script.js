const requestForm = document.querySelector("#request-form");
const formResult = document.querySelector("#form-result");

requestForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(requestForm);
  const message = [
    "Здравствуйте! Хочу попробовать подбор вакансий на 7 дней.",
    `Имя: ${data.get("name")}`,
    `Позиция: ${data.get("role")}`,
    `Город: ${data.get("city")}`,
    `Контакт: ${data.get("contact")}`,
  ].join("\n");
  const username = typeof TELEGRAM_USERNAME === "string" ? TELEGRAM_USERNAME.replace(/^@/, "") : "";
  const target = username
    ? `https://t.me/${username}?text=${encodeURIComponent(message)}`
    : `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(message)}`;

  window.open(target, "_blank", "noopener,noreferrer");
  formResult.textContent = username
    ? "Заявка подготовлена в Telegram. Нажмите «Отправить»."
    : "Заявка подготовлена. Добавьте Telegram username в site-config.js перед публикацией.";
});
