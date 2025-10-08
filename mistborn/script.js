document.addEventListener('DOMContentLoaded', () => {
    const metals = [
        // Physical Metals
        { name: 'Steel', pair: 'Iron', misting: 'Coinshot', category: 'Physical', type: 'External Pushing', description: 'Pushes on nearby metals.' },
        { name: 'Iron', pair: 'Steel', misting: 'Lurcher', category: 'Physical', type: 'External Pulling', description: 'Pulls on nearby metals.' },
        { name: 'Pewter', pair: 'Tin', misting: 'Pewterarm', category: 'Physical', type: 'Internal', description: 'Greatly enhances physical capabilities.' },
        { name: 'Tin', pair: 'Pewter', misting: 'Tineye', category: 'Physical', type: 'Internal', description: 'Enhances all five senses.' },

        // Mental Metals
        { name: 'Zinc', pair: 'Brass', misting: 'Rioter', category: 'Mental', type: 'External Pushing', description: 'Inflames the emotions of those nearby.' },
        { name: 'Brass', pair: 'Zinc', misting: 'Soother', category: 'Mental', type: 'External Pulling', description: 'Soothes or dampens the emotions of those nearby.' },
        { name: 'Copper', pair: 'Bronze', misting: 'Smoker', category: 'Mental', type: 'Internal', description: 'Hides oneself and others from Seekers by dampening Allomantic pulses.' },
        { name: 'Bronze', pair: 'Copper', misting: 'Seeker', category: 'Mental', type: 'Internal', description: 'Allows an Allomancer to hear Allomantic pulses, detecting Allomancy.' },

        // Temporal Metals
        { name: 'Cadmium', pair: 'Bendalloy', misting: 'Pulser', category: 'Temporal', type: 'External Pulling', description: 'Slows down time in a bubble around the Allomancer.' },
        { name: 'Bendalloy', pair: 'Cadmium', misting: 'Slider', category: 'Temporal', type: 'External Pushing', description: 'Speeds up time in a bubble around the Allomancer.' },
        { name: 'Gold', pair: 'Electrum', misting: 'Augur', category: 'Temporal', type: 'Internal', description: 'Reveals the person the user could have been if they had made different choices.' },
        { name: 'Electrum', pair: 'Gold', misting: 'Oracle', category: 'Temporal', type: 'Internal', description: 'Allows the user to see a few seconds into their own future.' },

        // Enhancement Metals
        { name: 'Duralumin', pair: 'Aluminum', misting: 'Duralumin Gnat', category: 'Enhancement', type: 'Internal', description: 'Enhances the effects of any other metal the Allomancer is burning.' },
        { name: 'Aluminum', pair: 'Duralumin', misting: 'Aluminum Gnat', category: 'Enhancement', type: 'Internal', description: 'Wipes the Allomancer\'s internal Allomantic reserves.' },
        { name: 'Chromium', pair: 'Nicrosil', misting: 'Leecher', category: 'Enhancement', type: 'External Pulling', description: 'Wipes the Allomantic reserves of another Allomancer upon physical contact.' },
        { name: 'Nicrosil', pair: 'Chromium', misting: 'Nicroburst', category: 'Enhancement', type: 'External Pushing', description: 'Enhances the Allomantic burn of another Allomancer upon physical contact.' },
    ];

    const visualizationContainer = document.getElementById('visualization-container');
    const infoBox = document.getElementById('info-box');

    metals.forEach(metal => {
        const metalElement = document.createElement('div');
        metalElement.classList.add('metal');
        metalElement.dataset.metal = metal.name;
        metalElement.textContent = metal.name;

        const bgColor = getMetalColor(metal.name);
        metalElement.style.backgroundColor = bgColor;
        metalElement.style.color = getTextColorForBg(bgColor);

        metalElement.addEventListener('mouseover', () => {
            updateInfoBox(metal);
            const pairedMetalElement = document.querySelector(`[data-metal="${metal.pair}"]`);
            if (pairedMetalElement) {
                pairedMetalElement.classList.add('paired');
            }
        });

        metalElement.addEventListener('mouseout', () => {
            const pairedMetalElement = document.querySelector(`[data-metal="${metal.pair}"]`);
            if (pairedMetalElement) {
                pairedMetalElement.classList.remove('paired');
            }
        });

        metalElement.addEventListener('click', () => {
            updateInfoBox(metal);
        });

        visualizationContainer.appendChild(metalElement);
    });

    function updateInfoBox(metal) {
        infoBox.innerHTML = `
            <h2>${metal.name} (${metal.misting})</h2>
            <p><strong>Category:</strong> ${metal.category}</p>
            <p><strong>Type:</strong> ${metal.type}</p>
            <p><strong>Paired Metal:</strong> ${metal.pair}</p>
            <p>${metal.description}</p>
        `;
    }

    function getMetalColor(metalName) {
        const colors = {
            'Steel': '#a9a9a9', 'Iron': '#696969', 'Pewter': '#d3d3d3', 'Tin': '#f5f5f5',
            'Zinc': '#dda0dd', 'Brass': '#b8860b', 'Copper': '#cd7f32', 'Bronze': '#8b4513',
            'Cadmium': '#4682b4', 'Bendalloy': '#add8e6', 'Gold': '#ffd700', 'Electrum': '#eee8aa',
            'Duralumin': '#87ceeb', 'Aluminum': '#dcdcdc', 'Chromium': '#c0c0c0', 'Nicrosil': '#e6e6fa'
        };
        return colors[metalName] || '#333';
    }

    function getTextColorForBg(bgColor) {
        const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
        const r = parseInt(color.substring(0, 2), 16); // hexToR
        const g = parseInt(color.substring(2, 4), 16); // hexToG
        const b = parseInt(color.substring(4, 6), 16); // hexToB
        const uicolors = [r / 255, g / 255, b / 255];
        const c = uicolors.map((col) => {
            if (col <= 0.03928) {
                return col / 12.92;
            }
            return Math.pow((col + 0.055) / 1.055, 2.4);
        });
        const L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
        return (L > 0.179) ? '#000000' : '#FFFFFF';
    }
});