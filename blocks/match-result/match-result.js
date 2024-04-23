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

const balanceTeamsByLevels = (players, numPlayersPerTeam) => {
    // Shuffle the players array
    players = shuffle(players);
    
    // Determine the number of teams
    const numTeams = players.length / numPlayersPerTeam;

    // Initialize an array to hold all teams
    const teams = Array.from({ length: numTeams }, () => []);

    // Initialize variables to keep track of the total skill of each team
    const totalSkill = Array.from({ length: numTeams }, () => 0);

    // Assign players to teams greedily, starting with the highest-skilled player
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const currentTeamIndex = i % numTeams;
        const currentTeam = teams[currentTeamIndex];
        currentTeam.push(player);
        totalSkill[currentTeamIndex] += player.level;
    }

    // Calculate the average total skill for each team
    const averageTotalSkill = totalSkill.reduce((acc, cur) => acc + cur) / numTeams;

    // Redistribute players to balance skill levels
    let iteration = 0;
    while (iteration < 1000) {
        let maxExcess = -Infinity;
        let maxExcessTeamIndex = -1;
        let minDeficit = Infinity;
        let minDeficitTeamIndex = -1;

        // Find the team with the maximum excess skill and the team with the minimum deficit skill
        for (let i = 0; i < numTeams; i++) {
            const skillDifference = totalSkill[i] - averageTotalSkill;
            if (skillDifference > maxExcess) {
                maxExcess = skillDifference;
                maxExcessTeamIndex = i;
            }
            if (skillDifference < minDeficit) {
                minDeficit = skillDifference;
                minDeficitTeamIndex = i;
            }
        }

        // If teams are balanced within tolerance, exit the loop
        if (Math.abs(maxExcess) <= 1 && Math.abs(minDeficit) <= 1) {
            break;
        }

        // Find the player with the highest skill level in the maxExcess team
        let maxExcessPlayer = null;
        let maxExcessPlayerIndex = -1;
        for (let i = 0; i < numPlayersPerTeam; i++) {
            if (teams[maxExcessTeamIndex][i].level > (maxExcessPlayer?.level || -Infinity)) {
                maxExcessPlayer = teams[maxExcessTeamIndex][i];
                maxExcessPlayerIndex = i;
            }
        }

        // Find the player with the lowest skill level in the minDeficit team
        let minDeficitPlayer = null;
        let minDeficitPlayerIndex = -1;
        for (let i = 0; i < numPlayersPerTeam; i++) {
            if (teams[minDeficitTeamIndex][i].level < (minDeficitPlayer?.level || Infinity)) {
                minDeficitPlayer = teams[minDeficitTeamIndex][i];
                minDeficitPlayerIndex = i;
            }
        }

        // If minDeficitPlayer is null, break the loop
        if (!minDeficitPlayer) {
            break;
        }

        // Swap the players
        teams[maxExcessTeamIndex][maxExcessPlayerIndex] = minDeficitPlayer;
        teams[minDeficitTeamIndex][minDeficitPlayerIndex] = maxExcessPlayer;

        // Update total skills
        totalSkill[maxExcessTeamIndex] += minDeficitPlayer.level - maxExcessPlayer.level;
        totalSkill[minDeficitTeamIndex] += maxExcessPlayer.level - minDeficitPlayer.level;

        iteration++;
    }

    // Return an object with all teams
    return teams;
};

const shuffle = (array) => {
    // Fisher-Yates shuffle algorithm
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

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

const generateTeam = (team, index) => {
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

	return `<div class="team col mb-3 mx-2 card bg-secondary">
	<div><h3 class="text-white mt-3">Team ${index+1}</h3></div>
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
    <div id="result_row" class="result bg-dark-grey-opacity p-3 row"></div>
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
	let html = '';
	teams.forEach((team, index) => {
		html += generateTeam(team, index);
	});
	result.innerHTML = html;
	swapEventHandler(block, teams);
};

const historyHandler = (block, eventName) => {
	const backBtn = document.getElementById('backBtn');
	const nextBtn = document.getElementById('nextBtn');
	let teams;
	if (eventName === 'reroll') {
		teams = balanceTeamsByLevels(state.players, 5);
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
	const teams = balanceTeamsByLevels(state.players, 5);
	// console.log(teams);
	teamsHistory.push(teams);
	resultRender(block, teams);
	block.querySelector('#rerollBtn').addEventListener('click', () => historyHandler(block, 'reroll'));
	block.querySelector('#backBtn').addEventListener('click', () => historyHandler(block, 'back'));
	block.querySelector('#nextBtn').addEventListener('click', () => historyHandler(block, 'next'));
};
