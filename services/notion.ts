const { Client } = require('@notionhq/client')

// Initializing a client
const notion = new Client({
    auth: 'secret_iSnqVOn5tsZ91WX9QsWIKieVveyvirbsussK54uw16x',
  })

;(async () => {
  const listUsersResponse = await notion.users.list({})
  console.log(listUsersResponse)
})()

;(async () => {
  const databaseId = '137d325e0edd40bb92d5446096c81482'
  const response = await notion.databases.retrieve({ database_id: databaseId })
  console.log(response)
})()

export {}
