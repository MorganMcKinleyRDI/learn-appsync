import gql from 'graphql-tag';

export default gql`
query {
  getMessage(id: "kjarchow@premiergp.com") {
    __typename
    id
    username
    message
  }
}`;