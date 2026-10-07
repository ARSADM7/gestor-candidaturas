# Gestor de Candidaturas

Aplicação web para registar e acompanhar candidaturas a emprego.

Guarda tudo **no próprio navegador** (`localStorage`). Sem servidor, sem
conta, sem dados enviados para lado nenhum. Funciona offline.

## Funcionalidades

- Registar, editar e eliminar candidaturas
- Estados: interesse, enviada, com resposta, entrevista, oferta, recusada
- Pesquisa por empresa, cargo ou nota
- Filtro por estado
- Resumo no topo: total, enviadas, com resposta, ofertas
- **Exportar** para ficheiro JSON
- **Importar** de JSON — com escolha entre substituir ou juntar
- Validação de campos e de URL
- Tema claro/escuro automático conforme o sistema
- Interface pensada para telemóvel

## Estrutura

```
index.html      estrutura, formulário em <dialog>
styles.css      estilos
app.js          store, render, validação, import/export
test/smoketest.js  testes da lógica (DOM mínimo, sem dependências)
```

## Tecnologias

- HTML semântico com `<dialog>` nativo
- CSS: variáveis, Grid, `color-mix()`, media queries
- JavaScript: IIFE, `localStorage`, `FileReader`, `Blob`, `URL.createObjectURL`
- Zero dependências, zero passo de build

## Correr localmente

Abrir `index.html` directamente, ou:

```bash
python3 -m http.server 8000
```

## Notas sobre os dados

Tudo fica guardado **só neste dispositivo**. Limpar os dados do navegador
apaga tudo. Por isso, usar **Exportar** antes de mudar de telemóvel ou de
limpar a cache — o ficheiro JSON pode depois ser importado outra vez.

## Licença

MIT. Ver [LICENSE](LICENSE).