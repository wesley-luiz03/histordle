const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR1vC5yJRIAlYclMvF-oycBG6cKBWdF6ppPDYwOyjyPJcV_jDM-p9ZY0H-_bt9c3DGjv4HKvhk-ARMd/pub?output=csv"; 

let todosLugares = [];
let lugarDoDia = null;
let palpitesRealizados = [];
let jogoFinalizado = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarBancoDeDados();
    definirLugarDoDia();
    recuperarSessaoSalva();
    configurarEventos();
});

async function carregarBancoDeDados() {
    try {
        console.log("Tentando carregar dados de:", CSV_URL);
        
        const resposta = await fetch(CSV_URL);
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const textoCsv = await resposta.text();
        const linhas = textoCsv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        
        // CORRIGIDO: Mudado de 'lines.shift()' para 'linhas.shift()' batendo com a variável declarada acima
        linhas.shift(); 

        todosLugares = linhas.map(linha => {
            const colunas = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                nome: colunas[0]?.replace(/"/g, '').trim(),
                pais: colunas[1]?.replace(/"/g, '').trim(),
                continente: colunas[2]?.replace(/"/g, '').trim(),
                tipo: colunas[3]?.replace(/"/g, '').trim(),
                ano: colunas[4]?.replace(/"/g, '').trim(),
                momento: colunas[5]?.replace(/"/g, '').trim(),
                imagem: colunas[6]?.replace(/"/g, '').trim() || "https://placehold.co/32"
            };
        }).filter(l => l.nome && l.nome.length > 0);
        
        console.log(`Sucesso! ${todosLugares.length} lugares históricos carregados.`);
    } catch (erro) {
        console.error("Falha detalhada de carregamento:", erro);
    }
}

function definirLugarDoDia() {
    if (todosLugares.length === 0) return;
    const hoje = new Date();
    const semente = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const indice = semente % todosLugares.length;
    lugarDoDia = todosLugares[indice];
    console.log("🤫 Lugar do Dia:", lugarDoDia.nome);
}

function recuperarSessaoSalva() {
    const estadoSalvo = carregarEstadoDoJogo('lugares');
    if (estadoSalvo) {
        palpitesRealizados = estadoSalvo.palpites;
        jogoFinalizado = estadoSalvo.venceu;

        palpitesRealizados.forEach(nomeChutado => {
            const lObj = todosLugares.find(l => l.nome.toLowerCase() === nomeChutado.toLowerCase());
            if (lObj) {
                const cores = compararAtributos(lObj, lugarDoDia);
                adicionarPalpiteAoPainel(lObj, cores, true);
            }
        });

        if (jogoFinalizado) {
            bloquearEntradas();
            mostrarVitoria();
        }
    }
}

function configurarEventos() {
    const input = document.getElementById("palpiteInput");
    const sugestoes = document.getElementById("sugestoesLista");
    const enviarBtn = document.getElementById("enviarBtn");

    if (!input || !sugestoes || !enviarBtn) return;

    input.addEventListener("input", () => {
        if (jogoFinalizado) return;
        const busca = input.value.toLowerCase().trim();
        sugestoes.innerHTML = "";
        
        if (busca.length < 1) {
            sugestoes.classList.add("hidden");
            return;
        }

        const filtrados = todosLugares.filter(l => 
            l.nome.toLowerCase().includes(busca) &&
            !palpitesRealizados.some(nomeSalvo => nomeSalvo.toLowerCase() === l.nome.toLowerCase())
        );

        if (filtrados.length > 0) {
            filtrados.forEach(l => {
                const li = document.createElement("li");
                li.className = "px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-100 transition-colors flex items-center gap-3";
                li.innerHTML = `
                    <img src="${l.imagem}" class="img-palpite" alt="" onerror="this.src='https://placehold.co/32'">
                    <span>${l.nome}</span>
                `;
                li.addEventListener("click", () => {
                    input.value = l.nome;
                    sugestoes.classList.add("hidden");
                    input.focus();
                });
                sugestoes.appendChild(li);
            });
            sugestoes.classList.remove("hidden");
        } else {
            sugestoes.classList.add("hidden");
        }
    });

    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !sugestoes.contains(e.target)) {
            sugestoes.classList.add("hidden");
        }
    });

    enviarBtn.addEventListener("click", realizarPalpite);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") realizarPalpite();
    });
}

function realizarPalpite() {
    if (jogoFinalizado) return;

    const input = document.getElementById("palpiteInput");
    const nomeChutado = input.value.trim();
    
    const lugarChutado = todosLugares.find(l => l.nome.toLowerCase() === nomeChutado.toLowerCase());

    if (!lugarChutado) {
        alert("Selecione um lugar válido diretamente da lista de sugestões!");
        return;
    }

    if (palpitesRealizados.some(nome => nome.toLowerCase() === nomeChutado.toLowerCase())) {
        alert("Você já tentou esse lugar hoje! Escolha outra opção.");
        input.value = "";
        return;
    }

    input.value = "";
    palpitesRealizados.push(lugarChutado.nome);

    const resultado = compararAtributos(lugarChutado, lugarDoDia);
    adicionarPalpiteAoPainel(lugarChutado, resultado, false);

    if (lugarChutado.nome.toLowerCase() === lugarDoDia.nome.toLowerCase()) {
        jogoFinalizado = true;
        bloquearEntradas();
        mostrarVitoria();
    }

    salvarEstadoDoJogo('lugares', palpitesRealizados, jogoFinalizado);
}

function bloquearEntradas() {
    const input = document.getElementById("palpiteInput");
    const enviarBtn = document.getElementById("enviarBtn");
    if (input) {
        input.disabled = true;
        input.placeholder = "Desafio diário concluído!";
    }
    if (enviarBtn) {
        enviarBtn.disabled = true;
        enviarBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
}

function compararAtributos(chute, alvo) {
    const res = {};
    res.continente = chute.continente === alvo.continente ? 'correto' : 'errado';
    res.pais = chute.pais === alvo.pais ? 'correto' : 'errado';
    res.tipo = chute.tipo === alvo.tipo ? 'correto' : 'errado';
    res.momento = chute.momento === alvo.momento ? 'correto' : 'errado';

    const anoChute = extrairAno(chute.ano);
    const anoAlvo = extrairAno(alvo.ano);
    const d = Math.abs(anoChute - anoAlvo);

    if (anoChute === anoAlvo) {
        res.ano = 'correto';
    } else if (d <= 100) {
        res.ano = 'parcial'; 
    } else {
        res.ano = 'errado';
    }

    res.direcaoAno = anoChute < anoAlvo ? '↑' : '↓';
    return res;
}

// ... remains structural ...
function extrairAno(anoStr) {
    if (!anoStr) return 0;
    const limpo = anoStr.toLowerCase().replace("a.c", "").replace("a.c.", "").trim();
    const valor = parseInt(limpo);
    return anoStr.toLowerCase().includes("a.c") ? -valor : valor;
}

function adicionarPalpiteAoPainel(l, cores, imediato = false) {
    const grid = document.getElementById("gridPalpites");
    if (!grid) return;

    const classeCor = (tipo) => {
        if (tipo === 'correto') return 'bg-emerald-600 border-emerald-500 text-white animate-flip';
        if (tipo === 'parcial') return 'bg-amber-600 border-amber-500 text-white animate-flip';
        return 'bg-rose-950 border-rose-900 text-slate-300';
    };

    const delay = (ms) => imediato ? '0ms' : ms;

    const novaLinha = document.createElement("div");
    novaLinha.className = "grid grid-cols-7 gap-2 text-center text-xs md:text-sm font-semibold mt-2 animate-fade-in";

    novaLinha.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-center animate-flip" style="animation-delay: ${delay('0ms')}">
            <img src="${l.imagem}" class="img-palpite-tabela" alt="" onerror="this.src='https://placehold.co/32'">
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-center font-bold animate-flip" style="animation-delay: ${delay('100ms')}">
            <span class="truncate">${l.nome}</span>
        </div>
        <div class="${classeCor(cores.continente)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('200ms')}">${l.continente}</div>
        <div class="${classeCor(cores.pais)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('300ms')}">${l.pais}</div>
        <div class="${classeCor(cores.tipo)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('400ms')}">${l.tipo}</div>
        <div class="${classeCor(cores.ano)} border rounded-lg p-3 flex flex-col items-center justify-center animate-flip" style="animation-delay: ${delay('550ms')}">
            <span>${l.ano}</span>
            ${cores.ano !== 'correto' ? `<span class="text-xs font-black mt-0.5">${cores.direcaoAno}</span>` : ''}
        </div>
        <div class="${classeCor(cores.momento)} border rounded-lg p-3 flex items-center justify-center leading-tight text-center animate-flip" style="animation-delay: ${delay('700ms')}">${l.momento}</div>
    `;

    grid.insertBefore(novaLinha, grid.firstChild);
}

function mostrarVitoria() {
    const modal = document.getElementById("modalVitoria");
    const info = document.getElementById("infoLugarDia");

    if (modal && info) {
        info.innerHTML = `
            <div class="flex items-center gap-4 mb-4 justify-center">
                <img src="${lugarDoDia.imagem}" class="w-16 h-16 rounded-full border-2 border-amber-500 object-cover" onerror="this.src='https://placehold.co/64'">
                <p class="text-lg font-bold text-amber-400">${lugarDoDia.nome}</p>
            </div>
            <p><strong>Localidade:</strong> ${lugarDoDia.pais} (${lugarDoDia.continente})</p>
            <p><strong>Tipo:</strong> ${lugarDoDia.tipo}</p>
            <p><strong>Ano Estimado:</strong> ${lugarDoDia.ano}</p>
            <p><strong>Contexto Geral:</strong> ${lugarDoDia.momento}</p>
        `;
        modal.classList.remove("hidden");
    }
}

function fecharModal() {
    const modal = document.getElementById("modalVitoria");
    if (modal) modal.classList.add("hidden");
}