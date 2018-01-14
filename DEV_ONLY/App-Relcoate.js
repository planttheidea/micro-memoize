import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import {render} from 'react-dom';

import Relocate from '../src';

document.body.style.backgroundColor = '#1d1d1d';
document.body.style.color = '#d5d5d5';
document.body.style.margin = 0;
document.body.style.padding = 0;

const firstElement = document.createElement('aside');

firstElement.id = 'firstElement';
firstElement.innerHTML = '<span>I am an existing span in the first child</span>';

const secondElement = document.createElement('section');

secondElement.id = 'secondElement';
secondElement.innerHTML = '<div>I am an existing div in the second child</div>';

const thirdElement = document.createElement('div');

thirdElement.id = 'thirdElement';

class App extends PureComponent {
  state = {
    firstElementMounted: false,
    firstTargetFirstElement: true,
    firstTargetNull: false,
    secondElementMounted: false
  };

  toggleFirstElement = () => {
    this.setState(({firstElementMounted}) => {
      return {
        firstElementMounted: !firstElementMounted
      };
    });
  };

  toggleFirstTarget = () => {
    this.setState(({firstTargetFirstElement}) => {
      return {
        firstTargetFirstElement: !firstTargetFirstElement
      };
    });
  };

  toggleFirstTargetNull = () => {
    this.setState(({firstTargetNull}) => {
      return {
        firstTargetNull: !firstTargetNull
      };
    });
  };

  toggleSecondElement = () => {
    this.setState(({secondElementMounted}) => {
      return {
        secondElementMounted: !secondElementMounted
      };
    });
  };

  render() {
    const {firstElementMounted, firstTargetFirstElement, firstTargetNull, secondElementMounted} = this.state;

    return (
      <div style={{borderBottom: '1px solid white', marginBottom: 20}}>
        <h1>Main tree</h1>

        <button
          onClick={this.toggleFirstElement}
          type="button"
        >
          Toggle first element
        </button>

        <button
          onClick={this.toggleSecondElement}
          type="button"
        >
          Toggle second element
        </button>

        <button
          onClick={this.toggleFirstTarget}
          type="button"
        >
          Toggle first element target node
        </button>

        <button
          onClick={this.toggleFirstTargetNull}
          type="button"
        >
          Toggle first element target null
        </button>

        {firstElementMounted && (
          <Relocate target={firstTargetNull ? null : firstTargetFirstElement ? firstElement : thirdElement}>
            <div>I am the first element to render</div>
          </Relocate>
        )}

        {secondElementMounted && (
          <Relocate
            shouldReplaceContents
            target={`#${secondElement.id}`}
          >
            <div>I am the second element to render</div>
          </Relocate>
        )}

        <div>When the relocated items are rendered in the main tree, this should always be last.</div>
      </div>
    );
  }
}

const renderApp = (container) => {
  render(<App />, container);
};

const div = document.createElement('div');

div.id = 'app-container';

renderApp(div);

document.body.appendChild(div);
document.body.appendChild(firstElement);
document.body.appendChild(secondElement);
document.body.appendChild(thirdElement);
