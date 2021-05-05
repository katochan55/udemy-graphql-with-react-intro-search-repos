import { useState } from "react";
import { ApolloProvider, Mutation, Query } from "react-apollo";
import { client } from "./client";
import { SEARCH_REPOSITORIES, ADD_STAR, REMOVE_STAR } from "./graphql";

function StarButton({ node, variables }) {
  const count = node.stargazers.totalCount;
  const show_stars = count === 1 ? "1 star" : `${count} stars`;
  const starred = node.viewerHasStarred;
  const show_starred = starred ? "starred" : "-";
  const StarStatus = ({ addOrRemoveStar }) => {
    return (
      <button
        onClick={() =>
          addOrRemoveStar({
            variables: { input: { starrableId: node.id } },
            update: (store, { data: { addStar, removeStar } }) => {
              const { starrable } = addStar || removeStar;
              const data = store.readQuery({
                query: SEARCH_REPOSITORIES,
                variables: variables,
              });
              const edges = data.search.edges;
              const newEdges = edges.map((edge) => {
                if (edge.node.id === node.id) {
                  const totalCount = edge.node.stargazers.totalCount;
                  const diff = starrable.viewerHasStarred ? 1 : -1;
                  const newTotalCount = totalCount + diff;
                  edge.node.stargazers.totalCount = newTotalCount;
                }
                return edge;
              });
              data.search.edges = newEdges;
              store.writeQuery({ query: SEARCH_REPOSITORIES, data });
            },
          })
        }
      >{`${show_stars} | ${show_starred}`}</button>
    );
  };

  return (
    <Mutation mutation={starred ? REMOVE_STAR : ADD_STAR}>
      {(addOrRemoveStar) => <StarStatus addOrRemoveStar={addOrRemoveStar} />}
    </Mutation>
  );
}

const PER_PAGE = 5;
const DEFAULT_VARIABLES = {
  first: PER_PAGE,
  after: null,
  last: null,
  before: null,
  query: "フロントエンドエンジニア",
};

function App() {
  const [variables, setVariables] = useState(DEFAULT_VARIABLES);
  const { first, after, last, before, query } = variables;

  function handleChange(e) {
    setVariables({ ...variables, query: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
  }

  function goNext(search) {
    setVariables({
      ...variables,
      first: PER_PAGE,
      after: search.pageInfo.endCursor,
      last: null,
      before: null,
    });
  }

  function goPrevious(search) {
    setVariables({
      ...variables,
      first: null,
      after: null,
      last: PER_PAGE,
      before: search.pageInfo.startCursor,
    });
  }

  return (
    <ApolloProvider client={client}>
      <form onSubmit={handleSubmit}>
        <input value={query} onChange={handleChange} />
      </form>
      <Query query={SEARCH_REPOSITORIES} variables={variables}>
        {({ loading, error, data }) => {
          if (loading) return "Loading...";
          if (error) return `Error! ${error.message}`;

          const search = data.search;
          const repositoryCount = search.repositoryCount;
          const repositoryUnit =
            repositoryCount === 1 ? "Repository" : "Repositories";

          return (
            <>
              <h2>
                GitHub Repositories Search Results -{" "}
                {data.search.repositoryCount} {repositoryUnit}
              </h2>
              <ul>
                {search.edges.map((edge) => {
                  const node = edge.node;
                  return (
                    <li key={node.id}>
                      <a
                        href={node.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {node.name}
                      </a>
                      &nbsp;
                      <StarButton node={node} variables={variables} />
                    </li>
                  );
                })}
              </ul>
              {search.pageInfo.hasPreviousPage ? (
                <button onClick={() => goPrevious(search)}>Previous</button>
              ) : null}
              {search.pageInfo.hasNextPage ? (
                <button onClick={() => goNext(search)}>Next</button>
              ) : null}
            </>
          );
        }}
      </Query>
    </ApolloProvider>
  );
}

export default App;
