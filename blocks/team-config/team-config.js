import { getLibs } from '../../scripts/utils.js';

class Player {
    constructor(name, position, level, tierText, btnHref) {
        this.name = name;
        this.position = position;
        this.level = level;
    }    
}

const defaultLevelMap = {
    UR: 0,
    B : 1,
    BS: 2,
    S : 3,
    SG : 4,
    G : 5,
    GP : 6,
    P : 7,
    PD: 8,
    D : 9,
    DM : 10,
    M : 12,
    GM : 14,
};

let state = {
    players: [],
    numOfPlayers: 10,
    levelConfig: defaultLevelMap,
};

const saveState = () => {
    state.players = [];
    document.querySelectorAll('.participant-div').forEach(p => {
        const name = p.querySelector('.input-participants').value;
        const positions = [];
        p.querySelectorAll('.position-item:checked').forEach(i => positions.push(i.dataset.position));
        state.players.push(new Player(name, positions, parseInt(p.querySelector('.level-input:checked').value)));
    });
    window.localStorage.state = JSON.stringify(state);
}

const getNewParticipant = (index, player) => {
    let levelEls = '';
    Object.keys(state.levelConfig).forEach(k => {
        const levelValue = state.levelConfig[k];
        levelEls += `
        <div class="col-auto px-0">
        <label for="mix_players_${index}_level_${k}" class="${player.level === levelValue ? 'active' : ''}">${k}</label>
        <input type="radio" id="mix_players_${index}_level_${k}" class="level-input level-input-${k} d-none" name="mix.players.${index}.level" required="required" value="${levelValue}" ${player.level === levelValue ? 'checked' : ''}>
        </div>`
    });
    return `
<div id="mix_players__${index}" class="participant-div ${player.cached ? 'cached' : ''} participant-div-form row mb-4 mb-xl-2">
    <div class="col-12 col-xl-3 d-flex align-items-center mb-2 mb-xl-0">
        <div class="input-group">
            <input type="text" id="mix_players_${index}_name" name="mix.players.${index}.name" class="form-control input-participants ${player.name ? '' : 'no-value'}" placeholder="Player ${index+1}" value="${player.name}" required>
        </div>
    </div>
    <div class="col-12 col-xl-2 positions mb-2 mb-xl-0">
        <div id="mix_players_${index}_position" class="d-flex align-items-end justify-content-xl-center">
            <label for="position_tank_${index}" id="label_position_tank_${index}" class="mx-1 label-position label-position-tank ${player.position.includes('tank') ? 'active' : ''}"></label>
            <input name="mix.players.${index}.position.tank" type="checkbox" class="position-item d-none" data-index="${index}" data-position="tank" id="position_tank_${index}" ${player.position.includes('tank') ? 'checked' : ''}>
            <label for="position_deal_${index}" id="label_position_deal_${index}" class="mx-1 label-position label-position-deal ${player.position.includes('deal') ? 'active' : ''}"></label>
            <input name="mix.players.${index}.position.deal" type="checkbox" class="position-item d-none" data-index="${index}" data-position="deal" id="position_deal_${index}" ${player.position.includes('deal') ? 'checked' : ''}>
            <label for="position_heal_${index}" id="label_position_heal_${index}" class="mx-1 label-position label-position-heal ${player.position.includes('heal') ? 'active' : ''}"></label>
            <input name="mix.players.${index}.position.heal" type="checkbox" class="position-item d-none" data-index="${index}" data-position="heal" id="position_heal_${index}" ${player.position.includes('heal') ? 'checked' : ''}>
        </div>
    </div>
    <div class="col-12 col-xl-7 mb-2 mb-xl-0">
        <div id="mix_players_${index}_level" class="level-participant row mx-0 gap-2">
            ${levelEls}
        </div>
    </div>
</div>`;
}

const levelConfig = () => {
    const levelConfigEl = document.querySelector('.level-config');
    Object.keys(state.levelConfig).forEach(k => {
        const configItem = document.createElement('div');
        configItem.classList.add('d-flex', 'flex-column', 'align-items-center', 'col-auto', 'px-0');
        configItem.dataset.tier = k;
        
        const inputId = `level_config_${k}`;
        
        const label = document.createElement('label');
        label.innerHTML = k;
        label.setAttribute('for', inputId);
        
        const input = document.createElement('input');
        input.id = inputId;
        input.classList.add('border-0');
        input.value = state.levelConfig[k];
        input.addEventListener('change', () => {
            state.levelConfig[k] = parseInt(input.value);
            document.querySelectorAll(`.level-input-${k}`).forEach(levelInput => levelInput.value = input.value);
            saveState();
        });

        configItem.append(label);
        configItem.append(input);
        levelConfigEl.append(configItem);
    });
};

const addPlayer = (index, player) => {
    const players = document.getElementById('mix_players');
    const div = document.createElement('div');
    const p = player || new Player('', [], 0, 'Not Found', '#');
    div.innerHTML = getNewParticipant(index, p);
    players.append(div);
    div.querySelectorAll('.position-item').forEach(input => input.addEventListener('change', () => {
        const label = document.getElementById(`label_position_${input.dataset.position}_${index}`);
        label.classList.toggle('active');
        saveState();
    }));
    div.querySelectorAll('.input-participants').forEach(i => i.addEventListener('change', () => {
        const playerEl = i.closest('.participant-div');
        playerEl.classList.remove('cached');
        saveState();
        i.classList.add('no-value');
        if (i.value) i.classList.remove('no-value');
    }));
    div.querySelectorAll('.level-input').forEach(i => {
        i.addEventListener('change', e => {
            div.querySelectorAll('.level-input').forEach(ii => {
                ii.previousElementSibling.classList.remove('active');
                if (ii.checked) ii.previousElementSibling.classList.add('active');
            });
            saveState();
        });
    });
};

const removePlayer = (index) => {
    const p = document.getElementById(`mix_players__${index}`);
    p.parentElement.remove();
    state.players.splice(index, 1);
}

const numParticipantsEvent = () => {
    const participantsSelect = document.getElementById('nb-participants');
    participantsSelect.value = state.numOfPlayers || 10;
    participantsSelect.addEventListener('change', (e) => {     
        const currentPlayers = document.querySelectorAll('.participant-div');
        if (currentPlayers.length < participantsSelect.value) {
            for (let i=currentPlayers.length; i<participantsSelect.value; i++) {
                addPlayer(i);
            }
        } else {
            for (let i=currentPlayers.length-1; i>=participantsSelect.value; i--) {
                removePlayer(i);
            }
        }
        state.numOfPlayers = participantsSelect.value;
        saveState();
    });
}

const initTeam = () => {
    if (window.localStorage.state) {
        state = JSON.parse(window.localStorage.state);
        if (!state.levelConfig) {
            state.levelConfig = defaultLevelMap;
        }
        else if(!state.levelConfig.E) {
            state.levelConfig = defaultLevelMap;
        }
    }
    const players = state.players;
    if (players.length) {
        players.forEach((p, i) => {
            addPlayer(i, p)
        });
    } else {
        for (let i=0; i<state.numOfPlayers; i++) {
            addPlayer(i);
        }
    }
    numParticipantsEvent();
    levelConfig();
};

const initHtmlBody = `<div class="container">
<div class="title py-5 text-center text-white"><h1>두근두근 오버워치2 내전 밸런싱 도구</h1>
</div>
<form id="mix_form" name="mix" autocomplete="on" onsubmit="return submitted()">
    <div class="bg-grey-opacity">
        <div class="container pb-5 position-relative">
            <div class="general-config row align-items-center py-3 mb-3 border-bottom border-dark border-3">
                <div class="form-group col-1">
                    <select class="head-select px-2" id="nb-participants" control-id="ControlID-3">
                        <option value="10" selected>10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="25">25</option>
                        <option value="30">30</option>
                        <option value="35">35</option>
                        <option value="40">40</option>

                    </select>
                </div>
                <div class="level-config col-11 offset-xl-4 col-xl-7 row gap-2"></div>
            </div>
            <div id="mix_players"></div>
            <div
                class="padding-top ad-div">
                <!-- leaderboard-bottom -->
                <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7854142479910574" data-ad-slot="1275355822" data-ad-format="auto" data-full-width-responsive="true"></ins>
                <script>
                    (adsbygoogle = window.adsbygoogle || []).push({});
                </script>
            </div>
            <div class="error-msg text-danger" style="display: none;">Fill out player's <strong>Name</strong>.</div>                      
        </div>
    </div>
</form>
</div>`;

export default async function init (block) {
    const { loadScript, loadStyle, decorateAutoBlock } = await import(`${getLibs()}/utils/utils.js`);
    loadStyle('/deps/bootstrap.min.css');
    loadStyle('/deps/font-awesome.min.css');
    const matchLink = block.querySelector('a');
    matchLink.classList.add('btn', 'btn-primary')
    const configBody = document.createElement('div');
    configBody.innerHTML = initHtmlBody;
    block.prepend(configBody);
    initTeam();
    await loadScript('/deps/bootstrap.bundle.min.js');    
}
