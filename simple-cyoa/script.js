document.addEventListener('DOMContentLoaded', () => {
    const storyTextElement = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');
    const storySelector = document.getElementById('story-selector');
    const loadButton = document.getElementById('load-story');
    const gameTitleElement = document.querySelector('header h1');

    let storyData = null;

    async function loadStory(storyFile) {
        try {
            const response = await fetch(storyFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            storyData = await response.json();
            document.title = storyData.title;
            gameTitleElement.textContent = storyData.title;
            showStoryNode('start');
        } catch (error) {
            console.error('Error loading story:', error);
            storyTextElement.innerText = 'Failed to load the story. Please try again.';
        }
    }

    function showStoryNode(nodeName) {
        const node = storyData.scenes[nodeName];
        if (!node) {
            console.error(`Story node "${nodeName}" not found!`);
            return;
        }

        storyTextElement.style.animation = 'text-fade-out 0.5s forwards';

        setTimeout(() => {
            storyTextElement.innerText = node.text;
            storyTextElement.style.animation = 'text-fade-in 1s forwards';
        }, 500);

        while (choicesContainer.firstChild) {
            choicesContainer.removeChild(choicesContainer.firstChild);
        }

        if (node.choices) {
            node.choices.forEach((choice, index) => {
                const button = document.createElement('button');
                button.classList.add('choice-button');
                button.innerText = choice.text;
                button.style.animation = `choice-appear 0.5s forwards ${index * 0.2}s`;
                button.addEventListener('click', () => {
                    showStoryNode(choice.next);
                });
                choicesContainer.appendChild(button);
            });
        }
    }

    loadButton.addEventListener('click', () => {
        const selectedStory = storySelector.value;
        if (selectedStory) {
            loadStory(selectedStory);
        }
    });

    // Initially hide the story and choices until a story is loaded
    storyTextElement.innerText = 'Please select a story from the dropdown and click "Load Story" to begin.';
});