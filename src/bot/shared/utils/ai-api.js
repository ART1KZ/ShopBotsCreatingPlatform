/**
 * Отправляет запрос к агенту Mistral AI и возвращает распарсенный объект ответа агента.
 * @param {string} agentId - Идентификатор агента Mistral.
 * @param {Object} json - JSON-объект с данными запроса (должен содержать messages).
 * @returns {Promise<Object>} - Распарсенный объект ответа агента (например, { category: "Название" }).
 * @throws {Error} - Если запрос не удался или ответ некорректен.
 */
export async function sendRequestToMistralAgent(agentId, json) {
    // console.log(json)
    // Проверяем входные параметры
    if (!agentId || typeof agentId !== "string") {
        throw new Error("agentId должен быть непустой строкой");
    }
    if (!json || typeof json !== "object") {
        throw new Error("json должен быть объектом");
    }

    // Получаем API-ключ из переменной окружения
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
        throw new Error("Переменная окружения MISTRAL_API_KEY не установлена");
    }

    // Формируем URL для запроса
    const url = "https://api.mistral.ai/v1/agents/completions";

    // Формируем сообщения
    const messages = [{ role: "user", content: JSON.stringify(json) }];

    // Выполняем POST-запрос с использованием fetch
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            agent_id: agentId,
            messages,
        }),
    });

    // Проверяем, успешен ли запрос
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            `Ошибка API: ${response.status} ${response.statusText} - ${errorText}`
        );
    }

    // Парсим JSON-ответ
    const responseJson = await response.json();

    // Проверяем структуру ответа
    if (!responseJson.choices || !responseJson.choices[0]?.message?.content) {
        throw new Error("Некорректный формат ответа от API");
    }

    try {
        return JSON.parse(responseJson.choices[0].message.content);
    } catch (parseError) {
        // console.log(responseJson.choices[0].message.content)
        throw new Error("Не удалось разобрать JSON в ответе агента");
    }
}
