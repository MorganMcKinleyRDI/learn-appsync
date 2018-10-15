import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import AllPosts from "./Components/AllPosts";
import AddPost from "./Components/AddPost";

import AWSAppSyncClient from "aws-appsync";
import { Rehydrated } from 'aws-appsync-react';
import { AUTH_TYPE } from "aws-appsync/lib/link/auth-link";
import { graphql, ApolloProvider, compose } from 'react-apollo';
import * as AWS from 'aws-sdk';
import AppSync from './aws-exports.js';

import AllMessagesQuery from './Queries/AllMessagesQuery';
import NewMessageMutation from './Queries/NewMessageMutation';
import NewPostsSubscription from './Queries/NewPostsSubscription';

import awsmobile from './aws-exports';
import Amplify, { Auth } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
Amplify.configure(awsmobile);
Amplify.configure({
    Auth: {

        // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
        identityPoolId: 'eu-west-1:beef362e-1ce7-459c-b792-3e1293c1d6a5',
        
        // REQUIRED - Amazon Cognito Region
        region: 'eu-west-1',

        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: 'eu-west-1_u8XmQbQo0',

        // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
        mandatorySignIn: true,
        userPoolWebClientId: '6m8ee6pthq324m4hvfntd08fli',
  }
});

// AppSync client instantiation
const client = new AWSAppSyncClient({
  disableOffline: false,
  url: awsmobile.aws_appsync_graphqlEndpoint,
  region: awsmobile.aws_appsync_region,
  auth: {
    // Amazon Cognito user pools using AWS Amplify
    type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
    jwtToken: async () => (await Auth.currentSession()).getIdToken().getJwtToken(),
  },
  complexObjectsCredentials: () => Auth.currentCredentials(),
  onError: (e) => { console.log(e) },
});

class App extends Component {
    render() {
        return (
        <div className="App">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <h1 className="App-title">Welcome to React</h1>
            </header>
            <NewPostWithData />
            <AllPostsWithData />
        </div>
        );
    }
}

const AppWithAuth = withAuthenticator(App, true);

const WithProvider = () => (
    <ApolloProvider client={client}>
        <Rehydrated>
            <AppWithAuth />
        </Rehydrated>
    </ApolloProvider>
);

export default WithProvider;

const AllPostsWithData = compose(
    graphql(AllMessagesQuery, {
        options: {
            fetchPolicy: 'cache-and-network'
        },
        props: (props) => ({
            posts: props.data.getMessage,
            subscribeToNewPosts: params => {
                props.data.subscribeToMore({
                    document: NewPostsSubscription,
                      updateQuery: (previousResult, { subscriptionData: { data : { onAddMessage } } }) => ({
                        getMessage: [
                          ...previousResult.getMessage.filter(message => message.id !== onAddMessage.id),
                          onAddMessage
                        ]
                      })
                });
            },
        })
    }),

)(AllPosts);

const NewPostWithData = graphql(NewMessageMutation, {
    props: (props) => ({
        test: props,
        onAdd: message => props.mutate({
            variables: message,
            optimisticResponse: () => ({ addMessage: { ...message, __typename: 'Message' } }),
        })
    }),
    options: {
        update: (dataProxy, { data: { addMessage } }) => {
            //addMessage.message = addMessage.message + ' PENDING'
            const query = AllMessagesQuery;
            const data = dataProxy.readQuery({ query });
            data.getMessage.push(addMessage);
            console.log(data)
            dataProxy.writeQuery({ query, data });
        }
    }
})(AddPost);