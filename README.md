# SayMyTimer

Um app mobile feito com Expo + React Native para controlar rodadas cronometradas, chamar o proximo participante, tocar alarmes e manter a pontuação dos times no mesmo lugar. A ideia e simples: menos confusao durante a brincadeira, mais foco no jogo.

Ele foi pensado para partidas em grupo, dinamicas presenciais, jogos de perguntas, desafios por equipes ou qualquer situação em que alguem sempre fala "calma, de quem e a vez mesmo?".

## O que o app faz

- Temporizador principal de 30 segundos.
- Temporizador secundario configuravel, usado como preparação antes de iniciar o temporizador principal.
- Chamada automatica do participante atual com base nos times cadastrados.
- Alternancia entre jogadores de times diferentes para deixar a ordem mais equilibrada.
- Alarme sonoro ao fim do temporizador principal.
- Som de inicio quando o temporizador secundario termina e dispara o temporizador de 30 segundos.
- Tela para escolher e testar sons de alarme.
- Placar por times, com linhas fixas para rodadas e total.
- Cadastro, remoção e reordenação de times.
- Cadastro, remoção e reordenação de participantes por time.
- Tema claro/escuro controlado pelo contexto global do app.
- Navegação por tabs com Expo Router.

## Como a experiencia funciona

Na tela principal, o app mostra quem esta na vez e dois temporizadores:

- O temporizador grande tem 30 segundos e representa a rodada principal.
- O temporizador pequeno e o tempo de preparação. Ele pode ser editado na tela de configuração de tempo.

Quando o temporizador pequeno termina, o app toca um som de inicio e ja dispara o temporizador de 30 segundos. Quando o temporizador principal termina, o app toca o alarme selecionado e avanca para o proximo participante.

A ordem dos participantes e montada intercalando os times. Por exemplo:

```txt
Time A: Ana, Bruno
Time B: Carla, Diego

Ordem gerada:
Ana, Carla, Bruno, Diego
```

Esse comportamento evita que um time jogue todos os participantes de uma vez enquanto os outros ficam esperando.

## Telas principais

### Temporizador

Arquivo principal: `app/(tabs)/index.tsx`

E o centro do app. Ela controla:

- os dois temporizadores;
- animação circular de progresso;
- som de inicio;
- som de alarme;
- vibração de fallback se o audio falhar;
- participante atual;
- troca de tema;
- acesso rapido ao placar e aos alarmes.

Toques uteis:

- Toque em um temporizador para iniciar/pausar.
- Pressione e segure um temporizador para resetar.
- Use o botao de refresh para reiniciar o fluxo da rodada.
- Use o botao de lapis ao lado do temporizador menor para editar o tempo de preparação.

### Pontuações

Arquivo principal: `screens/ScoresScreen.tsx`

Aqui moram os times, os participantes e a tabela de pontuação. Cada time vira uma coluna na tabela. As linhas atuais sao:

- `R1`
- `R2`
- `RFast`
- `R3`
- `Total`

Tambem da para:

- adicionar times;
- remover times;
- mover times para esquerda/direita;
- adicionar participantes dentro de cada time;
- remover participantes;
- reordenar participantes arrastando.

Essa tela usa `react-native-draggable-flatlist` para permitir ordenação manual dos participantes.

### Som do alarme

Arquivo principal: `screens/AlarmSettingsScreen.tsx`

Permite escolher qual audio sera tocado ao fim do temporizador principal. Os sons estao registrados em `config/alarms.ts` e apontam para arquivos `.wav` dentro de `assets/audio`.

Cada opção pode ser testada antes de selecionar. O app tambem limpa o preview ao sair da tela para evitar audio perdido tocando no fundo.

### Tempo de preparação

Arquivo principal: `screens/TimeEditorScreen.tsx`

Permite configurar o temporizador secundario. Hoje ele aceita valores entre 1 e 999 segundos.

### Sortear

Arquivo principal: `screens/DrawScreen.tsx`

Tela inicial para uma funcionalidade de sorteio/eliminação. Por enquanto ela apresenta a instrução da dinamica, mas ainda nao tem a interação completa implementada.

### Segunda tab

Arquivo principal: `app/(tabs)/two.tsx`

Ainda esta com conteudo padrao de template. A navegação ja existe, entao e um bom lugar para evoluir a tela de times, sorteio ou alguma area secundaria do app.

## Estrutura do projeto

```txt
say-my-timer/
  app/
    _layout.tsx              # Provider global, fontes, Stack e rotas principais
    (tabs)/
      _layout.tsx            # Layout da tab bar
      index.tsx              # Tela principal do temporizador
      two.tsx                # Segunda tab, ainda baseada no template
    alarm.tsx                # Rota para configuração de alarme
    edit-time.tsx            # Rota para editar temporizador secundario
    score.tsx                # Rota para placar
  assets/
    audio/                   # Sons de inicio e alarmes
    fonts/                   # Fontes locais
    images/                  # Icones, splash e imagens do app
  config/
    alarms.ts                # Registro dos alarmes disponiveis
  constants/
    Colors.ts                # Paleta base
  context/
    AppContext.tsx           # Estado global do app
  screens/
    AlarmSettingsScreen.tsx
    DrawScreen.tsx
    ScoresScreen.tsx
    TimeEditorScreen.tsx
  components/                # Componentes herdados/base do template Expo
  types/                     # Tipagens auxiliares
```

## Estado global

O arquivo `context/AppContext.tsx` centraliza o estado compartilhado. Ele guarda:

- contador simples;
- tabela de pontuações;
- colunas/times;
- participantes por time;
- tema atual;
- cores derivadas do tema;
- alarme selecionado;
- tempo do temporizador secundario.

O hook usado pelas telas e:

```ts
const { colors, themeMode, toggleTheme } = useApp();
```

As telas devem preferir `colors` do contexto quando precisam de tema. Assim o app inteiro responde ao modo claro/escuro sem cada tela inventar sua propria paleta.

## Temas e cores

A paleta base esta em `constants/Colors.ts`, mas o tema aplicado de verdade fica em `context/AppContext.tsx`:

- `lightTheme`
- `darkTheme`

Esses objetos seguem a interface `ThemeColors`, com campos como:

- `background`
- `surface`
- `card`
- `primary`
- `accent`
- `text`
- `textSecondary`
- `border`
- `inputBg`

Quando uma tela precisa mudar com o tema, o caminho recomendado e usar:

```tsx
const { colors } = useApp();
```

E aplicar:

```tsx
backgroundColor: colors.background;
color: colors.text;
borderColor: colors.border;
```

Simples, previsivel e sem precisar cacar `Colors.light` espalhado pelo app inteiro.

## Audio

O app usa `expo-audio`.

Arquivos importantes:

- `assets/audio/start.wav`: som tocado quando o tempo de preparação termina.
- `assets/audio/alarm2.wav` ate `alarm12.wav`: opções de alarme.
- `config/alarms.ts`: mapa de ids para arquivos de audio.

O temporizador tenta tocar o alarme selecionado. Se algo der errado com o audio, ele usa vibração como fallback.

## Tecnologias

- Expo 55
- React 19
- React Native 0.83
- Expo Router
- TypeScript
- Expo Audio
- React Native Reanimated
- React Native SVG
- React Native Gesture Handler
- React Native Draggable FlatList
- Expo Google Fonts

## Como rodar

Instale as dependencias:

```bash
npm install
```

Inicie o Expo:

```bash
npm start
```

Rodar no Android:

```bash
npm run android
```

Rodar no iOS:

```bash
npm run ios
```

Rodar na web:

```bash
npm run web
```

## Scripts disponiveis

```json
{
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web"
}
```

## Requisitos

- Node.js instalado.
- npm instalado.
- Ambiente Expo/React Native configurado.
- Para Android: Android Studio ou um dispositivo/emulador configurado.
- Para iOS: macOS com Xcode, quando for rodar nativamente.

## Observações de desenvolvimento

- O app usa Expo Router, entao novas rotas entram pela pasta `app/`.
- Telas mais completas estao na pasta `screens/` e sao expostas por arquivos de rota em `app/`.
- O estado compartilhado deve continuar no `AppContext` enquanto o app for pequeno/medio.
- Para novas telas visuais, use o `ThemeColors` em vez de cores fixas.
- Para novos alarmes, adicione o arquivo em `assets/audio` e registre em `config/alarms.ts`.
- A tela `app/(tabs)/two.tsx` ainda esta com cara de template e pode virar uma funcionalidade real.
- A tela `DrawScreen` tem estrutura pronta, mas a dinamica de sorteio ainda pode ser implementada.

## Possiveis proximos passos

- Persistir placar, times, participantes, tema e alarme selecionado com armazenamento local.
- Finalizar a tela de sorteio.
- Transformar a segunda tab em uma tela util do app.
- Calcular automaticamente a linha `Total` do placar.
- Melhorar feedback visual quando o alarme esta tocando.
- Adicionar testes para as funções de ordenação de times e participantes.
- Criar um fluxo de onboarding curtinho para explicar a logica dos temporizadores.

## Sobre o nome

SayMyTimer tem uma vibe de "me chama quando for minha vez". E basicamente isso mesmo: o app segura o tempo, chama o jogador, toca o alarme e deixa a rodada andar sem precisar de uma pessoa virando fiscal do cronometro.
