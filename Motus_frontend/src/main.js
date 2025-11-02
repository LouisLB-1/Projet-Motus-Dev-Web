const grille = document.getElementById('grille');
const audio = document.getElementById('musique');
let cases;
let mot;
let cols;
let rows;
let currentIndex = 1;
let currentRow = 0;
let streak = 0;
let scoreData;

function updateStreak() {
  const streakDiv = document.getElementById('streak');
  streakDiv.textContent = `🔥 Streak : ${streak} 🔥`;
}

function afficherVictoire() {
  const popupvic = document.getElementById('victoire');
  popupvic.style.display = 'block';
  streak++;
  updateStreak();
}

function afficherScores(scoreData) {
  const tbody = document.querySelector('#scoreTable tbody');
  tbody.innerHTML = '';

  scoreData.sort((a, b) => Number(b.score) - Number(a.score));

  scoreData.forEach((item) => {
    const tr = document.createElement('tr');
    const tdPlayer = document.createElement('td');
    tdPlayer.textContent = item.player;
    const tdScore = document.createElement('td');
    tdScore.textContent = item.score;

    tr.appendChild(tdPlayer);
    tr.appendChild(tdScore);
    tbody.appendChild(tr);
  });
}

async function motExiste(mot) {
  const url = `https://fr.wiktionary.org/w/api.php?action=query&format=json&origin=*&titles=${mot}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    return !pages[pageId].hasOwnProperty('missing');
  } catch (error) {
    console.error('Erreur lors de la vérification du mot :', error);
    return false;
  }
}

async function envoyerScore(streak) {
  const pseudo = prompt('Entrez votre pseudo :', 'player');
  if (pseudo === null || pseudo.trim() === '') {
    console.log('Envoi du score annulé : pseudo non renseigné.');
    return;
  }
  try {
    const response = await fetch('http://127.0.0.1:8000/items/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player: pseudo,
        score: String(streak),
      }),
    });
    if (!response.ok) {
      throw new Error("Erreur lors de l'envoi du score");
    }
    const data = await response.json();
    console.log('Score envoyé:', data);
  } catch (error) {
    console.error('Erreur POST:', error);
  }
}

async function getScore() {
  try {
    const response = await fetch('http://127.0.0.1:8000/items/');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    console.log('Scores reçus :', data);
    afficherScores(data);
  } catch (error) {
    console.error('Erreur lors du GET :', error.message);
  }
}

function afficherDefaite() {
  const popupdef = document.getElementById('defaite');
  popupdef.textContent = `😞 Tu as perdu ! Le mot était ${mot} 😞`;
  popupdef.style.display = 'block';
  envoyerScore(streak);
  streak = 0;
  updateStreak();
}

async function initGame() {
  const json = await fetch('https://trouve-mot.fr/api/random').then(
    (response) => response.json(),
  );
  mot = json[0]['name'];
  mot = mot.toUpperCase();
  mot = mot.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  console.log(mot);
  cols = mot.length;
  rows = 6;
  grille.innerHTML = '';
  grille.style.gridTemplateColumns = `repeat(${cols}, 60px)`;
  grille.style.gridTemplateRows = `repeat(${rows}, 60px)`;

  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement('div');
    cell.classList.add('case');
    grille.appendChild(cell);
  }

  cases = document.querySelectorAll('.case');

  for (let i = 0; i < rows; i++) {
    cases[i * cols].textContent = mot[0];
    cases[i * cols].classList.add('correct');
  }

  getScore();
  updateStreak();

  currentIndex = 1;
  currentRow = 0;

  const popupvic = document.getElementById('victoire');
  popupvic.style.display = 'none';

  const popupdef = document.getElementById('defaite');
  popupdef.style.display = 'none';
}

function rejouer() {
  initGame();
  audio.muted = false;
  audio.play();
}

document.addEventListener('keydown', async (event) => {
  if (!cases) return;

  if (/^[a-z]$/i.test(event.key)) {
    if (currentIndex < cols) {
      cases[currentIndex + currentRow * cols].textContent =
        event.key.toUpperCase();
      currentIndex++;
    }
  }

  if (event.key === 'Backspace') {
    if (currentIndex !== 1) {
      currentIndex--;
      cases[currentIndex + currentRow * cols].textContent = '';
    }
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (currentIndex === cols) {
      let guess = '';
      for (let i = 0; i < cols; i++) {
        guess += cases[currentRow * cols + i].textContent;
      }

      let existe = await motExiste(guess.toLowerCase());
      if (!existe) {
        alert("Ce mot n'existe pas dans le dictionnaire français !");
        return;
      }

      let etats = Array(cols).fill('absent');
      let lettresRestantes = mot.split('');

      for (let i = 0; i < cols; i++) {
        if (guess[i] === mot[i]) {
          etats[i] = 'correct';
          lettresRestantes[i] = null;
        }
      }

      for (let i = 0; i < cols; i++) {
        if (etats[i] === 'absent') {
          let index = lettresRestantes.indexOf(guess[i]);
          if (index !== -1) {
            etats[i] = 'present';
            lettresRestantes[index] = null;
          }
        }
      }

      for (let i = 1; i < cols; i++) {
        cases[currentRow * cols + i].classList.add(etats[i]);
      }

      if (etats.every((e) => e === 'correct')) {
        afficherVictoire();
      }

      if (currentRow == 5) {
        afficherDefaite();
      }

      currentRow++;
      currentIndex = 1;
    }
  }
});
