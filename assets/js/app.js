// ==========================================
// GERENCIADOR DE ESTADO GLOBAL E DIÁRIO (HISTORDLE)
// ==========================================

/**
 * Retorna a semente numérica do dia atual (ex: 20260716).
 */
function obterSementeDoDia() {
    const hoje = new Date();
    return hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
}

/**
 * Salva os palpites do modo atual no localStorage de forma segura para o dia corrente.
 * @param {string} modo - Nome do modo de jogo ('personagens', 'lugares', 'momentos')
 * @param {Array} palpites - Lista de objetos com os nomes dos palpites realizados
 * @param {boolean} venceu - Indica se o usuário já completou o desafio do dia
 */
function salvarEstadoDoJogo(modo, palpites, venceu = false) {
    const semente = obterSementeDoDia();
    const estado = {
        semente: semente,
        palpites: palpites,
        venceu: venceu
    };
    localStorage.setItem(`histordle_${modo}`, JSON.stringify(estado));
}

/**
 * Recupera o estado de jogo salvo para o modo específico.
 * Se a data mudou (semente diferente), ele limpa o cache automaticamente e retorna nulo.
 * @param {string} modo - Nome do modo de jogo
 */
function carregarEstadoDoJogo(modo) {
    const salvo = localStorage.getItem(`histordle_${modo}`);
    if (!salvo) return null;

    try {
        const estado = JSON.parse(salvo);
        const sementeAtual = obterSementeDoDia();

        // Se a semente salva for igual à de hoje, mantém o estado
        if (estado.semente === sementeAtual) {
            return estado;
        } else {
            // Se o dia mudou, limpa o cache desse modo específico
            localStorage.removeItem(`histordle_${modo}`);
            return null;
        }
    } catch (e) {
        console.error("Erro ao carregar o estado salvo:", e);
        return null;
    }
}