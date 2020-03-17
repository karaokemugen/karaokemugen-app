import React, { Component } from 'react';
import i18next from 'i18next';
import io from 'socket.io-client';
import { TaskItem } from '../../../../src/lib/types/taskItem';

let socket = io();

interface IProps {
  limit: number
}

interface IState {
  tasks?: Array<TaskItem>;
}
class TasksEvent extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			tasks: [],
		};
	}

	componentDidMount() {
		socket.on('tasksUpdated', (tasks:Array<TaskItem>) => {
      let t = this.state.tasks;
			for(let i in tasks)
      {
        t[i] = tasks[i];
        t[i].time = (new Date()).getTime();
      }
      this.setState({tasks:t});
		});
	}

  render() {
    let t = [];
    let tCount = 0;
    for(let i in this.state.tasks)
    {
      t.push(this.state.tasks[i])
    }

  	return (
      <div className="tasksEvent-wrapper">
        {
          t.map((item,i) => {
            if(tCount>=this.props.limit) // no more than 3 tasks displayed
              return null;

            if((new Date()).getTime() - item.item > 5000)
              return null;

            tCount++;

            return (<blockquote key={i}>
              <p className="text">
                {i18next.t(item.text)}
                <span className="subtext">{item.subtext}</span>
              </p>
              <div className="progress"><div className={"progress-bar " + (item.percentage===null ? 'unknown' : '')} style={{width:(item.percentage!==null ? item.percentage+'%' : '100%')}}></div></div>
            </blockquote>);
          })
        }
      </div>
  	);
  }
}

export default TasksEvent;
