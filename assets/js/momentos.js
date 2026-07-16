const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnicIpqSghVPRNN2qaHYfv16JpXzOU7Q6UevWiXKR9dU8z4nNQLhWXkw4CY3K_k-QhhvLWsNDDSjLj/pub?output=csv"; 

let todosMomentos = [];
let momentoDoDia = null;
let palpitesRealizados = [];
let jogoFinalizado = false;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarBancoDeDados();
    definirMomentoDoDia();
    recuperarSessaoSalva();
    configurarEventos();
});

async function carregarBancoDeDados() {
    try {
        const resposta = await fetch(CSV_URL);
        if (!resposta.ok) throw new Error(`HTTP error! status: ${resposta.status}`);
        
        const textoCsv = await resposta.text();
        const linhas = textoCsv.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        linhas.shift();

        todosMomentos = linhas.map(linha => {
            const colunas = inline.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const arr = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            return {
                nome: arr[0]?.replace(/"/g, '').trim(),
                tipo: arr[1]?.replace(/"/g, '').trim(),
                pais: arr[2]?.replace(/"/g, '').trim(),
                ano: arr[3]?.replace(/"/g, '').trim(),
                lider: arr[4]?.replace(/"/g, '').trim(),
                imagem: arr[5]?.replace(/"/g, '').trim() || "https://placehold.co/32"
            };
        }).filter(m => m.nome && m.nome.length > 0);
    } catch (erro) {
        console.error("Falha detalhada de carregamento:", erro);
    }
}

function definirMomentoDoDia() {
    if (todosMomentos.length === 0) return;
    const hoje = new Date();
    const semente = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
    const indice = semente % todosMomentos.length;
    momentoDoDia = todosMomentos[indice];
    console.log("🤫 Momento do Dia:", momentoDoDia.nome);
}

function recuperarSessaoSalva() {
    const estadoSalvo = carregarEstadoDoJogo('momentos');
    if (estadoSalvo) {
        palpitesRealizados = estadoSalvo.palpites;
        jogoFinalizado = estadoSalvo.venceu;

        palpitesRealizados.forEach(nomeChutado => {
            const mObj = todosMomentos.find(m => m.nome.toLowerCase() === nomeChutado.toLowerCase());
            if (mObj) {
                const cores = compararAtributos(mObj, momentoDoDia);
                adicionarPalpiteAoPainel(mObj, cores, true);
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

        const filtrados = todosMomentos.filter(m => 
            m.nome.toLowerCase().includes(busca) && 
            !palpitesRealizados.some(nomeSalvo => nomeSalvo.toLowerCase() === m.nome.toLowerCase())
        );

        if (filtrados.length > 0) {
            filtrados.forEach(m => {
                const li = document.createElement("li");
                li.className = "px-4 py-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-100 transition-colors flex items-center gap-3";
                li.innerHTML = `
                    <img src="${m.imagem}" class="img-palpite" alt="" onerror="this.src='https://placehold.co/32'">
                    <span>${m.nome}</span>
                `;
                li.addEventListener("click", () => {
                    input.value = m.nome;
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
    
    const momentoChutado = todosMomentos.find(m => m.nome.toLowerCase() === nomeChutado.toLowerCase());

    if (!momentoChutado) {
        alert("Selecione um momento válido diretamente da lista de sugestões!");
        return;
    }

    if (palpitesRealizados.some(nome => nome.toLowerCase() === nomeChutado.toLowerCase())) {
        alert("Você já tentou esse momento hoje! Escolha outra opção.");
        input.value = "";
        return;
    }

    input.value = "";
    palpitesRealizados.push(momentoChutado.nome);

    const resultado = compararAtributos(momentoChutado, momentoDoDia);
    adicionarPalpiteAoPainel(momentoChutado, resultado, false);

    if (momentoChutado.nome.toLowerCase() === momentoDoDia.nome.toLowerCase()) {
        jogoFinalizado = true;
        bloquearEntradas();
        mostrarVitoria();
    }

    salvarEstadoDoJogo('momentos', palpitesRealizados, jogoFinalizado);
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
    res.tipo = chute.tipo === alvo.tipo ? 'correto' : 'errado';
    res.pais = chute.pais === alvo.pais ? 'correto' : 'errado';
    res.lider = chute.lider === alvo.lider ? 'correto' : 'errado';

    const anoChute = extrairAno(chute.ano);
    const anoAlvo = extrairAno(alvo.ano);
    const diferenca = Math.abs(anoChute - anoAlvo);
    
    if (anoChute === alvo.ano) {
        res.ano = 'correto';
    } else if (diferenca <= 100) {
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

function adicionarPalpiteAoPainel(m, cores, imediato = false) {
    const grid = document.getElementById("gridPalpites");
    if (!grid) return;

    const classeCor = (tipo) => {
        if (tipo === 'correto') return 'bg-emerald-600 border-emerald-500 text-white';
        if (tipo === 'parcial') return 'bg-amber-600 border-amber-500 text-white';
        return 'bg-rose-950 border-rose-900 text-slate-300';
    };

    const delay = (ms) => imediato ? '0ms' : ms;

    const novaLinha = document.createElement("div");
    novaLinha.className = "grid grid-cols-6 gap-2 text-center text-xs md:text-sm font-semibold mt-2 animate-fade-in";

    novaLinha.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-center animate-flip" style="animation-delay: ${delay('0ms')}">
            <img src="${m.imagem}" class="img-palpite-tabela" alt="" onerror="this.src='https://placehold.co/32'">
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-center font-bold animate-flip" style="animation-delay: ${delay('100ms')}">
            <span class="truncate">${m.nome}</span>
        </div>
        <div class="${classeCor(cores.tipo)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('200ms')}">${m.tipo}</div>
        <div class="${classeCor(cores.pais)} border rounded-lg p-3 flex items-center justify-center animate-flip" style="animation-delay: ${delay('300ms')}">${m.pais}</div>
        <div class="${classeCor(cores.ano)} border rounded-lg p-3 flex flex-col items-center justify-center animate-flip" style="animation-delay: ${delay('400ms')}">
            <span>${m.ano}</span>
            ${cores.ano !== 'correto' ? `<span class="text-xs font-black mt-0.5">${cores.direcaoAno}</span>` : ''}
        </div>
        <div class="${classeCor(cores.lider)} border rounded-lg p-3 flex items-center justify-center leading-tight text-center animate-flip" style="animation-delay: ${delay('550ms')}">${m.lider}</div>
    `;

    grid.insertBefore(novaLinha, grid.firstChild);
}

function mostrarVitoria() {
    const modal = document.getElementById("modalVitoria");
    const info = document.getElementById("infoMomentoDia");

    if (modal && info) {
        info.innerHTML = `
            <div class="flex items-center gap-4 mb-4 justify-center">
                <img src="${momentoDoDia.imagem}" class="w-16 h-16 rounded-full border-2 border-amber-500 object-cover" onerror="this.src='https://placehold.co/64'">
                <p class="text-lg font-bold text-amber-400">${momentoDoDia.nome}</p>
            </div>
            <p><strong>Tipo:</strong> ${momentoDoDia.tipo}</p>
            <p><strong>Localidade:</strong> ${momentoDoDia.pais}</p>
            <p><strong>Ano de Início:</strong> ${momentoDoDia.ano}</p>
            <p><strong>Líder Atrelado:</strong> ${momentoDoDia.lider}</p>
        `;
        modal.classList.remove("hidden");
    }
}

function fecharModal() {
    const modal = document.getElementById("modalVitoria");
    if (modal) modal.classList.add("hidden");
}