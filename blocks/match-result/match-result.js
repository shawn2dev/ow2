import { getKeyByValue } from '../../scripts/utils.js';

let teamsHistory = [], historyIndex = 0, state = {};

const positionOrder = {
	'top': 1,
	'jungle': 2,
	'mid': 3,
	'adc': 4,
	'support': 5,
	'all': 6,
}

const balanceTeamsByLevels = (players) => {
	// Shuffle the players array
	players = shuffle(players);
	// players.sort((a, b) => b.level - a.level);

	// Determine the number of players per team
	const numPlayersPerTeam = Math.floor(players.length / 2);

	// Initialize two empty teams
	const team1 = [];
	const team2 = [];

	// Initialize variables to keep track of the total skill of each team
	let totalSkill1 = 0;
	let totalSkill2 = 0;

	// Assign players to teams greedily, starting with the highest-skilled player
	for (let i = 0; i < players.length; i++) {
		const player = players[i];
		if (i % 2 === 0 && team1.length < numPlayersPerTeam) {
			team1.push(player);
			totalSkill1 += player.level;
		} else if (team2.length < numPlayersPerTeam) {
			team2.push(player);
			totalSkill2 += player.level;
		} else {
			team1.push(player);
			totalSkill1 += player.level;
		}
	}

	// If the total skill of the two teams is not equal, swap one player between teams
	const tolerance = 1; // You can adjust this tolerance value
	const MAX_TRIAL = 200000; // to prevent infinity loop
	let trial = 0;
	while (Math.abs(totalSkill1 - totalSkill2) > tolerance && trial < MAX_TRIAL) {
		let swapped = false;
		for (let i = 0; i < team1.length; i++) {
			for (let j = 0; j < team2.length; j++) {
				const newTotalSkill1 = totalSkill1 - team1[i].level + team2[j].level;
				const newTotalSkill2 = totalSkill2 - team2[j].level + team1[i].level;
				if (Math.abs(newTotalSkill1 - newTotalSkill2) < Math.abs(totalSkill1 - totalSkill2)) {
					const temp = team1[i];
					team1[i] = team2[j];
					team2[j] = temp;
					totalSkill1 = newTotalSkill1;
					totalSkill2 = newTotalSkill2;
					swapped = true;
					break;
				}
			}
			if (swapped) {
				break;
			}
		}
		trial++;
	}

	// Return an object with both teams
	return { team1, team2 };
}

const shuffle = (array) => {
	// Fisher-Yates shuffle algorithm
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

const totalLevels = (team) => {
	let sum = 0;
	team.forEach(p => sum += p.level);
	return sum;
}

const generatePlayer = (player) => {
	let positionsHTML = '';
	player.position.forEach(p => positionsHTML += `<div class="icon label-position-${p} me-1" data-position="${p}"></div>`);
	return `
    <div class="player mt-3 p-2 d-flex justify-content-between gap-3">
        <div class="name py-1">${player.name}</div>
        <div class="position-level d-flex">
            <div class="position d-flex me-2">
                ${positionsHTML}
            </div>
            <div class="level bg-warning p-1 d-flex justify-content-between">
              <div>${getKeyByValue(state.levelConfig, player.level)}</div>
              <div><small>(<span class="level-num">${player.level}</span>)</small></div>
            </div>
        </div>
    </div>`;
};

const generateTeam = (team) => {
	let coveredPostions = new Set();
	let coveredPostionsHTML = '';
	let playersHTML = '';
	let allCounts = 0;
	let positionCounts = 0;
	team.forEach(p => {
		playersHTML += generatePlayer(p)
		p.position.forEach(position => {
			coveredPostions.add(position);
			if (position === 'all') {
				allCounts++;
			}
		});
	});
	coveredPostions = [...(coveredPostions)].sort((a, b) => {
		return positionOrder[a] - positionOrder[b];
	});
	coveredPostions.forEach(position => {
		coveredPostionsHTML += `<div class="icon label-position-${position} me-1"></div>`
		positionCounts++;
	});

	// For extra All positions
	for (let i = 0; i < allCounts - 1 && positionCounts < 5; i++) {
		coveredPostionsHTML += `<div class="icon label-position-all me-1"></div>`;
		positionCounts++;
	}

	// op.gg multiple
	const players = document.createElement('div');
	players.innerHTML = playersHTML;
	let summoners = '';
	players.querySelectorAll('.name').forEach(name => {
		summoners += `,${name.textContent}`;
	});

	return `<div class="team col-12 col-lg-6 col-xl-5 mb-3 mb-lg-0">
    ${playersHTML}
    <div class="mt-1 d-flex justify-content-between">
        <div class="covered-positions d-flex mt-2 ${positionCounts < 3 ? 'warning border border-3 border-danger' : ''}">
            ${coveredPostionsHTML}
        </div>
        <div class="total me-1 text-white">${totalLevels(team)}</div>
    </div>
</div>`;
}

const swapEventHandler = (block, teams) => {
	block.querySelectorAll('.player').forEach(p => {
		p.addEventListener('click', e => {
			let swap = block.querySelector('.swap');
			if (swap) {
				if (p.classList.contains('swap')) {
					p.classList.remove('swap');
				} else {
					// DO SWAP
					let temp = document.createElement('div');					
					temp.innerHTML = p.innerHTML;
					p.innerHTML = swap.innerHTML;
					swap.innerHTML = temp.innerHTML;
					block.querySelector('.swap').classList.remove('swap');
					
					document.querySelectorAll('.team').forEach((t) => {
						let total = 0;
						let coveredPostions = new Set();
						t.querySelectorAll('.level-num').forEach(n => total += parseInt(n.innerHTML));
						t.querySelector('.total').innerHTML = total;

						let coveredPostionsHTML = '';
						let positionCounts = 0;
						let allCounts = 0;
						t.querySelectorAll('.position .icon').forEach(position => {
							coveredPostions.add(position.dataset.position)
							if (position.dataset.position == 'all') {
								allCounts++;
							}
						});
						coveredPostions.forEach(position => {
							coveredPostionsHTML += `<div class="icon label-position-${position} me-1"></div>`
							positionCounts++;
						});

						coveredPostions = [...(coveredPostions)].sort((a, b) => {
							return positionOrder[a] - positionOrder[b];
						});
						
						// For extra All positions
						for (let i = 0; i < allCounts - 1 && positionCounts < 5; i++) {
							coveredPostionsHTML += `<div class="icon label-position-all me-1"></div>`;
							positionCounts++;
						}
						const cpEl = t.querySelector('.covered-positions');
						if (positionCounts >= 5) {
							cpEl.classList.remove('warning', 'border', 'border-3', 'border-danger');
						} else {
							cpEl.classList.add('warning', 'border', 'border-3', 'border-danger');
						}
						cpEl.innerHTML = coveredPostionsHTML;
						
						let summoners = '';
						t.querySelectorAll('.player .name').forEach(n => summoners += `,${n.textContent}`);
						t.querySelector('.opgg-all a').href = `https://www.op.gg/multisearch/na?summoners=${summoners.substring(1)}`;
					});
				}
			} else {
				p.classList.add('swap');
			}
		});
	})
}

const resultBody = `
<div class="container-fluid">
    <div id="result_row" class="result bg-dark-grey-opacity p-3 row justify-content-between"></div>
</div>
<div class="container-fluid rebalance-btn-container position-relative p-5 d-flex flex-column align-items-center justify-content-center">
	<div class="position-absolute copy-message text-success"></div>
	<div class="d-flex mb-2">
		<button id="backBtn" class="btn btn-secondary disabled"><</button>
		<button id="rerollBtn" class="py-2 px-5 mx-4 btn btn-primary">Rebalance<br><small>(Re-Roll)</small></button>
		<button id="nextBtn" class="btn btn-secondary disabled">></button>
	</div>
</div>
`;

const resultRender = (block, teams) => {
	const result = block.querySelector('#result_row');
	result.innerHTML = generateTeam(teams.team1) + generateTeam(teams.team2);
	swapEventHandler(block, teams);
};

const historyHandler = (block, eventName) => {
	const backBtn = document.getElementById('backBtn');
	const nextBtn = document.getElementById('nextBtn');
	let teams;
	if (eventName === 'reroll') {
		teams = balanceTeamsByLevels(state.players);
		teamsHistory.push(teams);
		historyIndex = teamsHistory.length - 1;
		resultRender(block, teams);
		backBtn.classList.remove('disabled');
		nextBtn.classList.add('disabled');
	} else if (eventName === 'back') {
		historyIndex--;
		teams = teamsHistory[historyIndex];
		resultRender(block, teams);
		nextBtn.classList.remove('disabled');
		if (historyIndex === 0) {
			backBtn.classList.add('disabled');
		}
	} else if (eventName === 'next') {
		historyIndex++;
		teams = teamsHistory[historyIndex];
		resultRender(block, teams);
		backBtn.classList.remove('disabled');
		if (historyIndex === teamsHistory.length - 1) {
			nextBtn.classList.add('disabled');
		}
	}
};

export default async function fn(block) {
	teamsHistory = [];
	historyIndex = 0;
	// API_KEY = await getRiotAPIKey();
	block.innerHTML = resultBody;
	window.localStorage.removeItem('matchHistory');
	state = JSON.parse(window.localStorage.state);
	const teams = balanceTeamsByLevels(state.players);
	teamsHistory.push(teams);
	resultRender(block, teams);
	block.querySelector('#rerollBtn').addEventListener('click', () => historyHandler(block, 'reroll'));
	block.querySelector('#backBtn').addEventListener('click', () => historyHandler(block, 'back'));
	block.querySelector('#nextBtn').addEventListener('click', () => historyHandler(block, 'next'));
};
