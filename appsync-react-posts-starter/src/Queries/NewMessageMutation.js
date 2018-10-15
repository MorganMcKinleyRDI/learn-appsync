import gql from 'graphql-tag';

export default gql`
mutation ($id: ID, $message: String, $username: String, $created: Int, $timestamp: Int) {
  addMessage(id: $id, message: $message, username: $username, created: $created, timestamp: $timestamp) {
  	__typename
    id
    username
    message
  }
}
`;