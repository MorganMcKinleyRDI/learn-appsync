import React, { Component } from "react";
import uuidv1 from "uuid/v1";

export default class AddPost extends Component {

    constructor(props) {
        super(props);
        this.state = this.getInitialState();
    }

    static defaultProps = {
        onAdd: () => null
    }

    getInitialState = () => ({
        message: '',
        id: '',
        username: '',
        timestamp: '',
        created: ''
    });

    handleChange = (field, event) => {
        const { target: { value } } = event;
        const id = uuidv1()
        const username = "kjarchow@premiergp.com"
        const timestamp = 123
        const created = 123

        this.setState({
            [field]: value,
            id: id,
            username: username,
            timestamp: timestamp,
            created: created
        });
    }

    handleAdd = () => {
        const { id, message, username, timestamp, created } = this.state
        this.setState(this.getInitialState(), () => {
            this.props.onAdd({ id, message, username, created, timestamp });
        });
    }

    handleCancel = () => {
        this.setState(this.getInitialState());
    }

    render() {
        return (
            <fieldset >
                <legend>Add new Message</legend>
                <div>
                    <label>Message<input type="text" placeholder="Title" value={this.state.message} onChange={this.handleChange.bind(this, 'message')} /></label>
                </div>
                <div>
                    <button onClick={this.handleAdd}>Add new message</button>
                    <button onClick={this.handleCancel}>Cancel</button>
                </div>
            </fieldset>
        );
    }
}