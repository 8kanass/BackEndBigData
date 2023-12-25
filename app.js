const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const neo4j = require('neo4j-driver');
const cors = require('cors');

const app = express();
app.use(cors());

app.set('views', path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'public')));

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '12345678'));
const session = driver.session();

app.get('/',function(req , res){
    res.send('It works');
})

// Create
app.post('/person', async (req, res) => {
    const { name, age } = req.body;
  
    try {
      const result = await session.run('CREATE (n:Person {name: $name, age: $age}) RETURN n', {name , age});
      res.json(result.records[0].get('n').properties);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
// Get all persons with ID
app.get('/persons', async (req, res) => {
  try {
    const result = await session.run('MATCH (n:Person) RETURN id(n) as id, n');
    const persons = result.records.map(record => {
      const properties = record.get('n').properties;
      const id = convertToNumber(record.get('id'));
      return { id, ...properties };
    });
    res.json(persons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert Neo4j's id to a JavaScript number
function convertToNumber(neo4jId) {
  return (neo4jId.high << 32) + neo4jId.low;
}

  // Read by ID
app.get('/person/:id', async (req, res) => {
  const id = parseInt(req.params.id); // Parse the ID from the URL parameter

  try {
    const result = await session.run('MATCH (n:Person) WHERE id(n) = $id RETURN n', { id });
    const person = result.records.map(record => record.get('n').properties)[0]; // Assuming there's only one person with the given ID
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  
  // Update by ID with new name and age
app.put('/person/:id', async (req, res) => {
  const id = parseInt(req.params.id); // Parse the ID from the URL parameter
  const { newName, newAge } = req.body;

  try {
    const result = await session.run('MATCH (n:Person) WHERE id(n) = $id SET n.name = $newName, n.age = $newAge RETURN n', { id, newName, newAge });
    res.json(result.records[0].get('n').properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
  
  // Delete by ID
app.delete('/person/:id', async (req, res) => {
  const id = parseInt(req.params.id); // Parse the ID from the URL parameter

  try {
    await session.run('MATCH (n:Person) WHERE id(n) = $id DETACH DELETE n', { id });
    res.json({ message: 'Person deleted succesfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001);
console.log('Server started on port 3001');

module.exports = app;