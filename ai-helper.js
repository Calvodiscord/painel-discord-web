const { GoogleGenerativeAI } = require("@google/generative-ai");

// Pega a chave de API das variáveis de ambiente
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("[AI Helper] AVISO: A variável de ambiente GEMINI_API_KEY não foi definida. A IA não funcionará e retornará uma mensagem padrão.");
}

// Inicializa o cliente da IA apenas se a chave existir
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Gera uma resposta de suporte usando a IA do Google Gemini.
 * @param {string} chatHistory - O histórico de mensagens do ticket.
 * @returns {Promise<string>} Uma resposta sugerida pela IA.
 */
async function generateAiResponse(chatHistory) {
    // Se a chave de API não estiver configurada, retorna uma mensagem padrão.
    if (!genAI) {
        return "O serviço de IA não está configurado. Por favor, aguarde um atendente humano.";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Você é um assistente de suporte inteligente e amigável para um servidor do Discord. Sua função é resolver problemas comuns. Analise o seguinte histórico de um ticket e forneça uma resposta útil, educada e concisa para o usuário em português. Se a pergunta for complexa ou exigir ação de um moderador, instrua o usuário a aguardar um membro da equipe. Histórico do chat:\n\n${chatHistory}\n\nResposta sugerida:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Erro na API de IA (Gemini):", error);
        return "Não foi possível gerar uma resposta de IA no momento. Por favor, aguarde um atendente humano.";
    }
}

module.exports = { generateAiResponse };