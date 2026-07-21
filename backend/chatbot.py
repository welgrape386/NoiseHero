from prompts.legal import search_legal
from prompts.system import SYSTEM_PROMPT
from prompts.templates import TEMPLATES

def get_template_response(user_input):
    return TEMPLATES.get(user_input, None)