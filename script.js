let usuarios = JSON.parse(localStorage.getItem("usuarios")) || {};
let usuarioAtual = null;
let tempoLimite = null;

function cadastrarUsuario() {
  const nome = document.getElementById("novoUsuario").value;
  const senha = document.getElementById("novaSenha").value;
  const pin = document.getElementById("novoPin").value;

  if (!nome || !senha || pin.length !== 4) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  if (usuarios[nome]) {
    alert("Usuário já existe.");
    return;
  }

  usuarios[nome] = {
    senha,
    pin,
    saldo: 0,
    cartao: gerarCartao(),
    historico: []
  };

  salvarDados();
  alert("Usuário cadastrado com sucesso!");
  mostrarLogin();
}

function mostrarCadastro() {
  document.getElementById("login-container").style.display = "none";
  document.getElementById("cadastro-container").style.display = "block";
}

function mostrarLogin() {
  document.getElementById("cadastro-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
}

function fazerLogin() {
  const user = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  if (usuarios[user] && usuarios[user].senha === senha) {
    usuarioAtual = user;
    document.getElementById("userLogado").textContent = user;
    document.getElementById("login-container").style.display = "none";
    document.getElementById("caixa-container").style.display = "block";
    atualizarSaldo();
    mostrarCartao();
    carregarHistorico();
    iniciarSessao();
    document.getElementById("agradecimento").style.display = "none";
  } else {
    alert("Usuário ou senha inválidos.");
  }
}

function sair() {
  usuarioAtual = null;
  document.getElementById("caixa-container").style.display = "none";
  document.getElementById("login-container").style.display = "block";
  document.getElementById("agradecimento").style.display = "block";
  clearTimeout(tempoLimite);
}

function recuperarSenha() {
  const nome = prompt("Digite seu nome de usuário para recuperar a senha:");
  if (usuarios[nome]) {
    const escolha = confirm("Deseja ver sua senha atual? (Cancelar = Criar nova senha)");
    if (escolha) {
      alert("Sua senha é: " + usuarios[nome].senha);
    } else {
      const novaSenha = prompt("Digite a nova senha:");
      if (novaSenha) {
        usuarios[nome].senha = novaSenha;
        salvarDados();
        alert("Senha alterada com sucesso!");
      } else {
        alert("A senha não foi alterada.");
      }
    }
  } else {
    alert("Usuário não encontrado.");
  }
}

function recuperarPIN() {
  const nome = prompt("Digite seu nome de usuário para recuperar o PIN:");
  if (usuarios[nome]) {
    const novaSenha = prompt("Para recuperar o PIN, crie uma nova senha de acesso:");
    if (novaSenha) {
      usuarios[nome].senha = novaSenha;
      const novoPin = prompt("Agora defina um novo PIN (4 dígitos):");
      if (novoPin && novoPin.length === 4) {
        usuarios[nome].pin = novoPin;
        salvarDados();
        alert("PIN e senha atualizados com sucesso!");
      } else {
        alert("PIN inválido. Operação cancelada.");
      }
    } else {
      alert("Operação cancelada. A senha não foi alterada.");
    }
  } else {
    alert("Usuário não encontrado.");
  }
}

function gerarCartao() {
  return "**** **** **** " + Math.floor(1000 + Math.random() * 9000);
}

function mostrarCartao() {
  document.getElementById("cartao-numero").textContent = usuarios[usuarioAtual].cartao;
}

function atualizarSaldo() {
  document.getElementById("saldo").textContent = `Saldo: R$ ${usuarios[usuarioAtual].saldo.toFixed(2)}`;
}

function registrar(tipo, valor) {
  const data = new Date().toLocaleString("pt-BR");
  const texto = `${data} - ${tipo}: R$ ${valor.toFixed(2)}`;
  usuarios[usuarioAtual].historico.push(texto);
  salvarDados();
  carregarHistorico();
}

function carregarHistorico() {
  const lista = document.getElementById("historico-lista");
  lista.innerHTML = "";
  usuarios[usuarioAtual].historico.slice().reverse().forEach(linha => {
    const li = document.createElement("li");
    li.textContent = linha;
    lista.appendChild(li);
  });
}

function validarPIN() {
  const pin = document.getElementById("pin").value;
  if (pin !== usuarios[usuarioAtual].pin) {
    alert("PIN incorreto.");
    return false;
  }
  return true;
}

function depositar() {
  if (!validarPIN()) {
    mensagem("PIN incorreto.");
    return;
  }

  const valor = parseFloat(document.getElementById("valor").value);
  if (valor > 0) {
    usuarios[usuarioAtual].saldo += valor;
    atualizarSaldo();
    registrar("Depósito", valor);
    mensagem("Depósito feito com sucesso!");
  } else {
    mensagem("Valor inválido.");
  }
}

function sacar() {
  if (!validarPIN()) return;

  const valor = parseFloat(document.getElementById("valor").value);
  const hoje = new Date().toLocaleDateString();
  const saquesHoje = usuarios[usuarioAtual].historico.filter(l => l.includes("Saque") && l.includes(hoje));

  if (saquesHoje.length >= 3) {
    mensagem("Limite de 3 saques diários atingido.");
    return;
  }

  if (valor > 0 && valor <= usuarios[usuarioAtual].saldo) {
    usuarios[usuarioAtual].saldo -= valor;
    atualizarSaldo();
    registrar("Saque", valor);
    mensagem("Saque feito com sucesso!");
  } else {
    mensagem("Saldo insuficiente.");
  }
}

function transferir() {
  if (!validarPIN()) return;

  const valor = parseFloat(document.getElementById("valor").value);
  const destino = prompt("Digite o nome do destinatário:");

  if (!usuarios[destino]) {
    alert("Usuário de destino não encontrado.");
    return;
  }

  if (valor > 0 && valor <= usuarios[usuarioAtual].saldo) {
    usuarios[usuarioAtual].saldo -= valor;
    usuarios[destino].saldo += valor;
    atualizarSaldo();
    registrar(`Transferência para ${destino}`, valor);
    usuarios[destino].historico.push(`${new Date().toLocaleString("pt-BR")} - Recebido de ${usuarioAtual}: R$ ${valor.toFixed(2)}`);
    salvarDados();
    mensagem(`Transferência feita para ${destino}`);
  } else {
    mensagem("Saldo insuficiente ou valor inválido.");
  }
}

function gerarExtrato() {
  const doc = new jspdf.jsPDF();
  usuarios[usuarioAtual].historico.forEach((linha, i) => {
    doc.text(linha, 10, 10 + i * 10);
  });
  doc.save("extrato.pdf");
}

function mensagem(texto) {
  document.getElementById("mensagem").textContent = texto;
}

function salvarDados() {
  localStorage.setItem("usuarios", JSON.stringify(usuarios));
}

function iniciarSessao() {
  clearTimeout(tempoLimite);
  tempoLimite = setTimeout(() => {
    alert("Sessão expirada. Faça login novamente.");
    sair();
  }, 2 * 60 * 1000);
}

window.onload = () => {
  mostrarCadastro();

  const btnRecuperarPIN = document.createElement("button");
  btnRecuperarPIN.textContent = "Recuperar PIN";
  btnRecuperarPIN.style.marginTop = "10px";
  btnRecuperarPIN.onclick = recuperarPIN;

  const loginContainer = document.getElementById("login-container");
  if (loginContainer) {
    loginContainer.appendChild(btnRecuperarPIN);
  }
};
