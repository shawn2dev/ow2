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
    let temperature = 1000; // initial temperature
    let coolingRate = 0.99; // cooling rate

    while (iteration < 1000) {
        let excessTeams = [];
        let deficitTeams = [];

        // Find teams with excess skill and teams with deficit skill
        for (let i = 0; i < numTeams; i++) {
            const skillDifference = totalSkill[i] - averageTotalSkill;
            if (skillDifference > 0) {
                excessTeams.push({ teamIndex: i, excess: skillDifference });
            } else if (skillDifference < 0) {
                deficitTeams.push({ teamIndex: i, deficit: -skillDifference });
            }
        }

        // If no teams have excess or deficit skill, exit the loop
        if (excessTeams.length === 0 || deficitTeams.length === 0) {
            break;
        }

        // Sort excess teams by excess skill in descending order
        excessTeams.sort((a, b) => b.excess - a.excess);

        // Sort deficit teams by deficit skill in descending order
        deficitTeams.sort((a, b) => b.deficit - a.deficit);

        // Swap players between excess teams and deficit teams
        for (let i = 0; i < excessTeams.length && i < deficitTeams.length; i++) {
            const excessTeamIndex = excessTeams[i].teamIndex;
            const deficitTeamIndex = deficitTeams[i].teamIndex;

            // Find the player with the highest skill level in the excess team
            let excessPlayer = null;
            let excessPlayerIndex = -1;
            for (let j = 0; j < numPlayersPerTeam; j++) {
                if (teams[excessTeamIndex][j].level > (excessPlayer?.level || -Infinity)) {
                    excessPlayer = teams[excessTeamIndex][j];
                    excessPlayerIndex = j;
                }
            }

            // Find the player with the lowest skill level in the deficit team
            let deficitPlayer = null;
            let deficitPlayerIndex = -1;
            for (let j = 0; j < numPlayersPerTeam; j++) {
                if (teams[deficitTeamIndex][j].level < (deficitPlayer?.level || Infinity)) {
                    deficitPlayer = teams[deficitTeamIndex][j];
                    deficitPlayerIndex = j;
                }
            }

            // If deficitPlayer is null, break the loop
            if (!deficitPlayer) {
                break;
            }

            // Check if swapping players would worsen the balance
            const excessSkillDifference = totalSkill[excessTeamIndex] - averageTotalSkill;
            const deficitSkillDifference = totalSkill[deficitTeamIndex] - averageTotalSkill;
            const delta = (excessSkillDifference - excessPlayer.level + deficitPlayer.level) * (deficitSkillDifference + excessPlayer.level - deficitPlayer.level);

            // Accept the swap with a probability based on the temperature
            if (Math.random() < Math.exp(-delta / temperature)) {
                // Swap the players
                teams[excessTeamIndex][excessPlayerIndex] = deficitPlayer;
                teams[deficitTeamIndex][deficitPlayerIndex] = excessPlayer;

                // Update total skills
                totalSkill[excessTeamIndex] -= excessPlayer.level - deficitPlayer.level;
                totalSkill[deficitTeamIndex] += excessPlayer.level - deficitPlayer.level;
            }
        }

        // Decrease the temperature
        temperature *= coolingRate;

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
	<div class="mx-auto"><input class="bg-black text-white mt-3 text-center" placeholder="Team ${index+1}"></div>
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
						if (positionCounts >= 3) {
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
    <div id="result_row" class="result bg-dark-grey-opacity p-3 row justify-content-center"></div>
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
