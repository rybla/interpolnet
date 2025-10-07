document.addEventListener('DOMContentLoaded', () => {
    const metals = [
        // Physical Metals
        { name: 'Steel', misting: 'Coinshot', category: 'Physical', type: 'External Pushing', description: 'Pushes on nearby metals.' },
        { name: 'Iron', misting: 'Lurcher', category: 'Physical', type: 'External Pulling', description: 'Pulls on nearby metals.' },
        { name: 'Pewter', misting: 'Pewterarm', category: 'Physical', type: 'Internal', description: 'Greatly enhances physical capabilities.' },
        { name: 'Tin', misting: 'Tineye', category: 'Physical', type: 'Internal', description: 'Enhances all five senses.' },

        // Mental Metals
        { name: 'Zinc', misting: 'Rioter', category: 'Mental', type: 'External Pushing', description: 'Inflames the emotions of those nearby.' },
        { name: 'Brass', misting: 'Soother', category: 'Mental', type: 'External Pulling', description: 'Soothes or dampens the emotions of those nearby.' },
        { name: 'Copper', misting: 'Smoker', category: 'Mental', type: 'Internal', description: 'Hides oneself and others from Seekers by dampening Allomantic pulses.' },
        { name: 'Bronze', misting: 'Seeker', category: 'Mental', type: 'Internal', description: 'Allows an Allomancer to hear Allomantic pulses, detecting Allomancy.' },

        // Temporal Metals
        { name: 'Cadmium', misting: 'Pulser', category: 'Temporal', type: 'External Pulling', description: 'Slows down time in a bubble around the Allomancer.' },
        { name: 'Bendalloy', misting: 'Slider', category: 'Temporal', type: 'External Pushing', description: 'Speeds up time in a bubble around the Allomancer.' },
        { name: 'Gold', misting: 'Augur', category: 'Temporal', type: 'Internal', description: 'Reveals the person the user could have been if they had made different choices.' },
        { name: 'Electrum', misting: 'Oracle', category: 'Temporal', type: 'Internal', description: 'Allows the user to see a few seconds into their own future.' },

        // Enhancement Metals
        { name: 'Duralumin', misting: 'Duralumin Gnat', category: 'Enhancement', type: 'Internal', description: 'Enhances the effects of any other metal the Allomancer is burning.' },
        { name: 'Aluminum', misting: 'Aluminum Gnat', category: 'Enhancement', type: 'Internal', description: 'Wipes the Allomancer\'s internal Allomantic reserves.' },
        { name: 'Chromium', misting: 'Leecher', category: 'Enhancement', type: 'External Pulling', description: 'Wipes the Allomantic reserves of another Allomancer upon physical contact.' },
        { name: 'Nicrosil', misting: 'Nicroburst', category: 'Enhancement', type: 'External Pushing', description: 'Enhances the Allomantic burn of another Allomancer upon physical contact.' },
    ];

    const visualizationContainer = document.getElementById('visualization-container');
    const infoBox = document.getElementById('info-box');

    metals.forEach(metal => {
        const metalElement = document.createElement('div');
        metalElement.classList.add('metal');
        metalElement.textContent = metal.name;
        metalElement.style.backgroundColor = getMetalColor(metal.name);

        metalElement.addEventListener('mouseover', () => {
            updateInfoBox(metal);
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
});