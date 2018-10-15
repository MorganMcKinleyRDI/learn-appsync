import gql from 'graphql-tag';

export default gql`
subscription SubscribeToMessages {
	onAddMessage {
	    __typename
	    id
	    username
	    message
	}
}`;