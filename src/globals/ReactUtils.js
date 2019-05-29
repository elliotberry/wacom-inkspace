import React, {Component} from 'react';

const ParentContext = React.createContext(null);

let ReactUtils = {
	createParentTracker(ComponentClass) {
		class ParentBridge extends React.PureComponent {
			origin;

			render() {
				return (
					<ParentContext.Consumer>
					{
						(parent) => {
							// if (this.origin)
							// 	console.log('I am:', this.origin, 'my parent is:', parent ? parent.origin : null);

							if (parent && parent.origin) {
								Object.defineProperty(parent.origin, "parent", {
									configurable: true,
									get: () => parent.origin.props.parent
								});
							}

							return (
								<ParentContext.Provider value={this}>
									<ComponentClass ref={instance => this.origin = instance} parent={parent ? parent.origin : null} {...this.props} />
								</ParentContext.Provider>
							);
						}
					}
					</ParentContext.Consumer>
				)
			}
		}

		// return wrapped component to be exported in place of yours
		return ParentBridge;
	}
};

export default ReactUtils;
