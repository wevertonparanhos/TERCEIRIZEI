/**
 * Backup do Terceirizei OS no Google Drive — roda dentro da SUA conta Google.
 *
 * Passo a passo (uma vez só):
 *  1. Acesse https://script.google.com e crie um "Novo projeto".
 *  2. Apague o código de exemplo e cole este arquivo inteiro. Salve.
 *  3. Em "Configurações do projeto" (engrenagem) > "Propriedades do script",
 *     adicione a propriedade BACKUP_TOKEN com o mesmo valor configurado na Vercel.
 *  4. Escolha a função "criarGatilho" e clique em Executar (autorize o acesso ao
 *     Drive e a serviços externos). Isso agenda a execução a cada 2 horas.
 *  5. Rode "executarBackup" uma vez para testar — o arquivo aparece na pasta
 *     "Backups Terceirizei OS" do seu Drive.
 */

const BASE_URL = "https://app.terceirizeibpo.com.br";
const PASTA = "Backups Terceirizei OS";
const MANTER_DIAS = 30;
const LINHAS_POR_PAGINA = 500;

function executarBackup() {
  try {
    const token = PropertiesService.getScriptProperties().getProperty("BACKUP_TOKEN");
    if (!token) throw new Error("Propriedade BACKUP_TOKEN não configurada.");

    const manifest = buscar_("/api/backup/manifest", token);
    const dados = {};
    const contagens = {};

    manifest.tables.forEach(function (tabela) {
      let offset = 0;
      let linhas = [];
      while (true) {
        const pagina = buscar_(
          "/api/backup/table?name=" + encodeURIComponent(tabela) + "&offset=" + offset + "&limit=" + LINHAS_POR_PAGINA,
          token
        );
        linhas = linhas.concat(pagina.rows);
        if (pagina.rows.length < LINHAS_POR_PAGINA) break;
        offset += LINHAS_POR_PAGINA;
      }
      dados[tabela] = linhas;
      contagens[tabela] = linhas.length;
    });

    const agora = new Date();
    const carimbo = Utilities.formatDate(agora, "America/Sao_Paulo", "yyyy-MM-dd_HH-mm");
    const conteudo = JSON.stringify({
      geradoEm: agora.toISOString(),
      contagensNoInicio: manifest.counts,
      contagensBaixadas: contagens,
      tabelas: dados,
    });
    const nome = "backup-terceirizei-" + carimbo + ".json";
    const arquivo = Utilities.gzip(Utilities.newBlob(conteudo, "application/json", nome), nome + ".gz");

    const pasta = pasta_();
    pasta.createFile(arquivo);
    limpar_(pasta);
  } catch (erro) {
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      "FALHA no backup do Terceirizei OS",
      "O backup automático falhou em " + new Date() + ":\n\n" + erro
    );
    throw erro;
  }
}

function criarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "executarBackup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("executarBackup").timeBased().everyHours(2).create();
}

function buscar_(caminho, token) {
  const resposta = UrlFetchApp.fetch(BASE_URL + caminho, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });
  if (resposta.getResponseCode() !== 200) {
    throw new Error("HTTP " + resposta.getResponseCode() + " em " + caminho + ": " + resposta.getContentText().slice(0, 200));
  }
  return JSON.parse(resposta.getContentText());
}

function pasta_() {
  const existentes = DriveApp.getFoldersByName(PASTA);
  return existentes.hasNext() ? existentes.next() : DriveApp.createFolder(PASTA);
}

function limpar_(pasta) {
  const limite = new Date().getTime() - MANTER_DIAS * 24 * 60 * 60 * 1000;
  const arquivos = pasta.getFiles();
  while (arquivos.hasNext()) {
    const a = arquivos.next();
    if (a.getDateCreated().getTime() < limite) a.setTrashed(true);
  }
}
