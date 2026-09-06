import pytest
from app.core.executor import WorkflowExecutor

@pytest.mark.asyncio
async def test_code_script_execution(db_session):
    executor = WorkflowExecutor(db_session)
    
    # 1. Test basic transformation using $json
    node_1 = {
        "id": "node_script_1",
        "type": "code-script",
        "data": {
            "config": {
                "code": "output = {'doubled_numbers': [x * 2 for x in $json['numbers']], 'sum': sum($json['numbers'])}"
            }
        }
    }
    context_1 = {
        "$json": {"numbers": [1, 2, 3, 4, 5]},
        "$node": {}
    }
    res_1 = await executor.execute_node(node_1, context_1)
    assert res_1 == {"doubled_numbers": [2, 4, 6, 8, 10], "sum": 15}

@pytest.mark.asyncio
async def test_code_script_syntax_error(db_session):
    executor = WorkflowExecutor(db_session)
    
    node_err = {
        "id": "node_script_err",
        "type": "code-script",
        "data": {
            "config": {
                "code": "invalid python code syntax !!!"
            }
        }
    }
    context = {"$json": {}, "$node": {}}
    
    with pytest.raises(ValueError) as exc_info:
        await executor.execute_node(node_err, context)
    assert "Code Script Execution Error" in str(exc_info.value)
