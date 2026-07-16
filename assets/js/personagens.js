const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRC7YxtfA5fYYBXGRsd_dZeFj8fYJYHu2kanQuQ3aYHhiN2hV2KsOtB5L2dFqPXhZ78x25Em3nMDH6n/pub?output=csv";

const mapeamentoContinentes = {
    "França": "Europa", "Itália": "Europa", "Alemanha": "Europa", "Inglaterra": "Europa", "Reino Unido": "Europa",
    "Portugal": "Europa", "Espanha": "Europa", "Grécia": "Europa", "Áustria": "Europa", "Suíça": "Europa",
    "Polônia": "Europa", "Países Baixos": "Europa", "Ucrânia": "Europa",
    "Egito": "África", "África do Sul": "África", "Argélia": "África",
    "Brasil": "América do Sul", "Argentina": "América do Sul", "Venezuela": "América do Sul",
    "Estados Unidos": "América do Norte", "Cuba": "América do Norte",
    "Iraque": "Ásia", "China": "Ásia", "Índia": "Ásia", "Arábia Saudita": "Ásia", "Rússia": "Ásia", "Irã": "Ásia", "Mongólia": "Ásia", "Japão": "Ásia"
};

let todosPersonagens = [];
let personagemDoDia = null;
let palpitesRealizados = [];
let jogoFinalizado = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarBancoDeDados();
    definirPersonagemDoDia();
    recuperarSessaoSalva();
    configurarEventos();
});

async function carregarBancoDeDados() {
    try {
        const resposta = await fetch(CSV_URL);
        if (!resposta.ok) throw new Error(`Erro HTTP! Status: ${resposta.status}`);
        
        const textoCsv = await resposta.text();
        const lines = textoCsv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        lines.shift(); 

        todosPersonagens = lines.map(linha => {
            const arr = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                nome: arr[0]?.replace(/"/g, '').trim(),
                genero: arr[1]?.replace(/"/g, '').trim(),
                vivo: arr[2]?.replace(/"/g, '').trim(),
                pais: arr[3]?.replace(/"/g, '').trim(),
                evento: arr[4]?.replace(/"/g, '').trim(),
                ano: arr[5]?.replace(/"/g, '').trim(),
                imagem: arr[6]?.replace(/"/g, '').trim() || "https://placehold.co/32"
            };
        }).filter(p => p.nome && p.nome.length > 0); 
    } catch (erro) {
        console.error("Falha detalhada de carregamento:", erro);
    }
}

function definirPersonagemDoDia() {
    if (todosPersonagens.length === 0) return;
    const hoje = new Date();
    const semente = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const indice = semente % todosPersonagens.length;
    personagemDoDia = todosPersonagens[indice];
    console.log("🤫 Personagem do Dia:", personagemDoDia.nome);
}

function recuperarSessaoSalva() {
    const estadoSalvo = carregarEstadoDoJogo('personagens');
    if (estadoSalvo) {
        palpitesRealizados = estadoSalvo.palpites;
        jogoFinalizado = estadoSalvo.venceu;

        palpitesRealizados.forEach(nomeChutado => {
            const pObj = todosPersonagens.find(p => p.nome.toLowerCase() === nomeChutado.toLowerCase());
            if (pObj) {
                const cores = compararAtributos(pObj, personagemDoDia);
                adicionarPalpiteAoPainel(pObj, cores, true); 
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

        const filtrados = todosPersonagens.filter(p => 
            p.nome.toLowerCase().includes(busca) && 
            !palpitesRealizados.some(nomeSalvo => nomeSalvo.toLowerCase() === p.nome.toLowerCase())
        );

        if (filtrados.length > 0) {
            filtrados.forEach(p => {
                const li = document.createElement("li");
                li.className = "px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-100 transition-colors flex items-center gap-3";
                li.innerHTML = `
                    <img src="${p.imagem}" class="img-palpite" alt="" onerror="this.src='https://placehold.co/32'">
                    <span>${p.nome}</span>
                `;
                li.addEventListener("click", () => {
                    input.value = p.nome;
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
    
    const personagemChutado = todosPersonagens.find(p => p.nome.toLowerCase() === nomeChutado.toLowerCase());

    if (!personagemChutado) {
        alert("Selecione um personagem válido diretamente da lista de sugestões!");
        return;
    }

    if (palpitesRealizados.some(nome => nome.toLowerCase() === nomeChutado.toLowerCase())) {
        alert("Você já tentou esse personagem hoje! Escolha outra opção.");
        input.value = "";
        return;
    }

    input.value = "";
    palpitesRealizados.push(personagemChutado.nome);

    const resultado = compararAtributos(personagemChutado, personagemDoDia);
    adicionarPalpiteAoPainel(personagemChutado, resultado, false);

    if (personagemChutado.nome.toLowerCase() === personagemDoDia.nome.toLowerCase()) {
        jogoFinalizado = true;
        bloquearEntradas();
        mostrarVitoria();
    }

    salvarEstadoDoJogo('personagens', palpitesRealizados, jogoFinalizado);
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
    res.genero = chute.genero === alvo.genero ? 'correto' : 'errado';
    res.vivo = chute.vivo === alvo.vivo ? 'correto' : 'errado';

    const contChute = mapeamentoContinentes[chute.pais] || "Desconhecido";
    const contAlvo = mapeamentoContinentes[alvo.pais] || "Desconhecido";

    if (chute.pais === alvo.pais) {
        res.pais = 'correto';
    } else if (contChute === contAlvo && contChute !== "Desconhecido") {
        res.pais = 'parcial'; 
    } else {
        res.pais = 'errado';
    }

    res.evento = chute.evento === alvo.evento ? 'correto' : 'errado';

    const anoChute = extrairAno(chute.ano);
    const anoAlvo = extrairAno(alvo.ano);
    const diferenca = Math.abs(anoChute - anoAlvo);
    
    if (anoChute === anoAlvo) {
        res.ano = 'correto';
    } else if (diferenca <= 50) {
        res.ano = 'parcial'; 
    } else {
        res.ano = 'errado';
    }

    res.direcaoAno = anoChute < anoAlvo ? '↑' : '↓'; 
    return res;
}

function extrairAno(anoStr) {
    if (!anoStr) return 0;
    const limpo = anoStr.toLowerCase().replace("a.c", "").replace("a.c.", "").trim();
    const valor = parseInt(limpo);
    return anoStr.toLowerCase().includes("a.c") ? -valor : valor;
}

function adicionarPalpiteAoPainel(p, cores, imediato = false) {
    const grid = document.getElementById("gridPalpites");
    if (!grid) return;

    const classeCor = (tipo) => {
        if (tipo === 'correto') return 'bg-emerald-600 border-emerald-500 text-white';
        if (tipo === 'parcial') return 'bg-amber-600 border-amber-500 text-white';
        return 'bg-rose-950 border-rose-900 text-slate-300';
    };

    const delay = (ms) => imediato ? '0ms' : ms;

    const novaLinha = document.createElement("div");
    novaLinha.className = "grid grid-cols-7 gap-2 text-center text-xs md:text-sm font-semibold mt-2 animate-fade-in";

    novaLinha.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-center animate-flip" style="animation-delay: ${delay('0ms')}">
            <img src="${p.imagem}" class="img-palpite-tabela" alt="" onerror="this.src='https://placehold.co/32'">
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-center font-bold animate-flip" style="animation-delay: ${delay('100ms')}">
            <span class="truncate">${p.nome}</span>
        </div>
        <div class="${classeCor(cores.genero)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('200ms')}">${p.genero}</div>
        <div class="${classeCor(cores.vivo)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('300ms')}">${p.vivo}</div>
        <div class="${classeCor(cores.pais)} border rounded-lg p-3 flex flex-col items-center justify-center animate-flip" style="animation-delay: ${delay('400ms')}">
            <span>${p.pais}</span>
            <span class="text-[10px] opacity-75">(${mapeamentoContinentes[p.pais] || 'Outro'})</span>
        </div>
        <div class="${classeCor(cores.evento)} border rounded-lg p-3 flex items-center justify-center leading-tight text-center animate-flip" style="animation-delay: ${delay('550ms')}">${p.evento}</div>
        <div class="${classeCor(cores.ano)} border rounded-lg p-3 flex flex-col items-center justify-center animate-flip" style="animation-delay: ${delay('700ms')}">
            <span>${p.ano}</span>
            ${cores.ano !== 'correto' ? `<span class="text-xs font-black mt-0.5">${cores.direcaoAno}</span>` : ''}
        </div>
    `;

    grid.insertBefore(novaLinha, grid.firstChild);
}

function mostrarVitoria() {
    const modal = document.getElementById("modalVitoria");
    const info = document.getElementById("infoPersonagemDia");

    if (modal && info) {
        info.innerHTML = `
            <div class="flex items-center gap-4 mb-4 justify-center">
                <img src="${personagemDoDia.imagem}" class="w-16 h-16 rounded-full border-2 border-amber-500 object-cover" onerror="this.src='https://placehold.co/64'">
                <p class="text-lg font-bold text-amber-400">${personagemDoDia.nome}</p>
            </div>
            <p><strong>País de Origem:</strong> ${personagemDoDia.pais}</p>
            <p><strong>Ano de Nascimento:</strong> ${personagemDoDia.ano}</p>
            <p><strong>Fato de Destaque:</strong> ${personagemDoDia.evento}</p>
        `;
        modal.classList.remove("hidden");
    }
}

function fecharModal() {
    const modal = document.getElementById("modalVitoria");
    if (modal) modal.classList.add("hidden");
}