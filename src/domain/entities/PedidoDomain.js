// Camada Domain: regras puras do negocio que nao dependem de banco ou express

const CANAIS_PERMITIDOS = ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'];
const STATUS_PERMITIDOS = [
  'AGUARDANDO_PAGAMENTO',
  'EM_PREPARO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO'
];

class PedidoDomain {
  // Valida se o canal do pedido veio certo conforme exige o roteiro
  static validarCanal(canal) {
    if (!canal || !CANAIS_PERMITIDOS.includes(canal.toUpperCase())) {
      return false;
    }
    return true;
  }

  // Valida se a mudanca de status faz sentido
  static validarStatus(status) {
    if (!status || !STATUS_PERMITIDOS.includes(status.toUpperCase())) {
      return false;
    }
    return true;
  }

  // Calcula o valor total somando quantidade * precoUnitario de cada item
  static calcularTotal(itensComPreco) {
    let total = 0;
    for (const item of itensComPreco) {
      total += item.quantidade * item.precoUnitario;
    }
    // Arredonda pra 2 casas decimais pra evitar bug de ponto flutuante no JS
    return Math.round(total * 100) / 100;
  }

  // Regra simples de fidelidade: 1 ponto a cada 10 reais gastos
  static calcularPontosGanhos(valorTotal) {
    return Math.floor(valorTotal / 10);
  }
}

module.exports = {
  PedidoDomain,
  CANAIS_PERMITIDOS,
  STATUS_PERMITIDOS
};
